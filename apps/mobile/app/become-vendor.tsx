import { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import {
  ArrowLeft,
  Building2,
  Check,
  FileText,
  Upload,
  User as UserIcon,
} from "lucide-react-native";
import { auth, db, storage, functions } from "@/lib/firebase";
import { useAlert } from "@/context/alert-context";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H1, P } from "@/components/ui/text";
import { LEGAL_URLS, openWebPage } from "@/lib/links";
import { getErrorCode, getErrorMessage } from "@/lib/errors";

// Mobile version of apps/web/src/app/create-store — same fields, same
// Storage paths and Firestore writes, so the server side (onStoreCreated
// trial/auto-approve, onStoreOnboardingCreated emails, referrals,
// firestore.rules' KYC + pending-store checks) treats both the same.
// `?resubmit=<storeId>` reuses step 1 alone for a store the super admin
// sent back with "needs more info": update ID/details, then flip the
// store back to pending (the one owner-allowed onboardingStatus change).

type PickedFile = { uri: string; name: string; mimeType: string };
type VendorType = "individual" | "company";

const CATEGORIES = [
  { value: "Fashion", label: "Fashion & Apparel" },
  { value: "Beauty", label: "Beauty & Cosmetics" },
  { value: "Art", label: "Art & Digital" },
  { value: "Food", label: "Food & Beverage" },
  { value: "Other", label: "Other" },
];
const STORE_TYPES = [
  { value: "product", label: "Products" },
  { value: "service", label: "Services" },
  { value: "hybrid", label: "Both" },
] as const;

const MAX_FILE_MB = 10; // storage.rules' limit for verifications/

// GHA-XXXXXXXXX-X, same as the web form's formatter.
const formatGhanaCard = (input: string) => {
  if (input === "") return "";
  const digits = input.replace(/[^0-9]/g, "");
  return "GHA-" + digits.substring(0, 9) + (digits.length > 9 ? "-" + digits.substring(9, 10) : "");
};

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

export default function BecomeVendorScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert, showActionSheet } = useAlert();
  const { resubmit } = useLocalSearchParams<{ resubmit?: string }>();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(!!auth.currentUser);
  const [hasAccount, setHasAccount] = useState(false);
  const [vendorType, setVendorType] = useState<VendorType>("individual");
  // Download URLs already on users/{uid}.identity — a resubmit or a signed-
  // in vendor only has to replace what the admin asked about.
  const [onFile, setOnFile] = useState<{ front?: string; back?: string; companyDoc?: string }>({});
  const [files, setFiles] = useState<{ front?: PickedFile; back?: PickedFile; companyDoc?: PickedFile }>({});
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    ghanaCard: "",
    contactName: "",
    contactPosition: "",
    contactPhone: "",
    contactEmail: "",
    email: "",
    password: "",
    storeName: "",
    storeSlug: "",
    category: "Fashion",
    storeType: "product" as (typeof STORE_TYPES)[number]["value"],
    referralCode: "",
  });
  const set = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "storeName" ? { storeSlug: slugify(value) } : {}),
    }));

  const fail = (message: string) =>
    showAlert({ title: "Check your details", message, type: "error", singleButton: true });

  // Prefill from the account's user doc; a vendor with ID already on file
  // (adding a store) goes straight to the store step, like web.
  const loadProfile = async (uid: string, goToStoreStep: boolean) => {
    const data = (await getDoc(doc(db, "users", uid))).data();
    if (!data) return false;
    const identity = data.identity || {};
    setVendorType(data.vendorType === "company" ? "company" : "individual");
    setOnFile({
      front: identity.ghanaCardFrontUrl,
      back: identity.ghanaCardBackUrl,
      companyDoc: identity.companyDoc,
    });
    setForm((prev) => ({
      ...prev,
      fullName: data.fullName || data.displayName || prev.fullName,
      phone: data.phone || prev.phone,
      ghanaCard: identity.ghanaCard || prev.ghanaCard,
      contactName: data.contactPerson?.name || prev.contactName,
      contactPosition: data.contactPerson?.position || prev.contactPosition,
      contactPhone: data.contactPerson?.phone || prev.contactPhone,
      contactEmail: data.contactPerson?.email || prev.contactEmail,
    }));
    const verified = !!(identity.ghanaCard || identity.companyDoc);
    if (verified && goToStoreStep) setStep(2);
    return verified;
  };

  useMountEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) loadProfile(uid, !resubmit).catch(console.error);
  });

  // --- Documents ---
  const pickPhoto = async (fromCamera: boolean): Promise<PickedFile | null> => {
    if (fromCamera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      fail("Allow camera access in Settings to photograph your document.");
      return null;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6 };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled) return null;
    const a = res.assets[0];
    return { uri: a.uri, name: a.fileName || "photo.jpg", mimeType: a.mimeType || "image/jpeg" };
  };

  const pickPdf = async (): Promise<PickedFile | null> => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (res.canceled) return null;
    const a = res.assets[0];
    if (a.size && a.size > MAX_FILE_MB * 1024 * 1024) {
      fail(`That PDF is too large. Max ${MAX_FILE_MB}MB.`);
      return null;
    }
    return { uri: a.uri, name: a.name, mimeType: a.mimeType || "application/pdf" };
  };

  const chooseFile = (key: keyof typeof files, allowPdf: boolean) => {
    // The sheet is a <Modal>; iOS won't present the native picker while it's
    // still animating out, so give it a moment.
    const run = (picker: () => Promise<PickedFile | null>) => () =>
      setTimeout(async () => {
        try {
          const file = await picker();
          if (file) setFiles((prev) => ({ ...prev, [key]: file }));
        } catch (e) {
          fail(getErrorMessage(e) || "Couldn't open that file.");
        }
      }, 400);
    showActionSheet({
      title: "Add document",
      options: [
        { label: "Take photo", onPress: run(() => pickPhoto(true)) },
        { label: "Choose from photos", onPress: run(() => pickPhoto(false)) },
        ...(allowPdf ? [{ label: "Choose PDF", onPress: run(pickPdf) }] : []),
      ],
    });
  };

  const upload = async (uid: string, prefix: string, file: PickedFile) => {
    const blob = await (await fetch(file.uri)).blob();
    const path = `verifications/${uid}/${prefix}-${Date.now()}-${file.name.replace(/[^\w.]/g, "_")}`;
    const fileRef = ref(storage, path);
    // contentType matters: storage.rules only accepts images/PDFs here.
    await uploadBytes(fileRef, blob, { contentType: file.mimeType });
    return getDownloadURL(fileRef);
  };

  // --- Step 1: vendor details ---
  const validateVendor = (): string | null => {
    if (form.fullName.trim().length < 2) return "Enter your legal name.";
    if (form.phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
    if (vendorType === "company") {
      if (!files.companyDoc && !onFile.companyDoc) return "Add your registration certificate.";
      if (!form.contactName || !form.contactPosition || !form.contactPhone || !form.contactEmail.includes("@")) {
        return "Fill in the contact person's details.";
      }
    } else {
      if (!/^GHA-\d{9}-\d$/.test(form.ghanaCard)) return "Enter your Ghana Card number (GHA-XXXXXXXXX-X).";
      if ((!files.front && !onFile.front) || (!files.back && !onFile.back)) {
        return "Add photos of the front and back of your Ghana Card.";
      }
    }
    return null;
  };

  const handleVendorSubmit = async () => {
    setLoading(true);
    try {
      let uid = auth.currentUser?.uid;
      let identityOnFile = false;

      if (!uid) {
        if (!form.email || form.password.length < 6) {
          return fail("Enter your email and a password of at least 6 characters.");
        }
        // Check the form before creating an account, so a mistake here
        // doesn't leave a half-made account behind.
        const invalid = !hasAccount && validateVendor();
        if (invalid) return fail(invalid);
        try {
          const cred = hasAccount
            ? await signInWithEmailAndPassword(auth, form.email.trim(), form.password)
            : await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
          uid = cred.user.uid;
          setSignedIn(true);
        } catch (e) {
          const code = getErrorCode(e);
          if (code === "auth/email-already-in-use") {
            setHasAccount(true);
            return fail("You already have an account with that email. Enter its password and tap Sign In.");
          }
          if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
            return fail("Wrong email or password.");
          }
          throw e;
        }
        // Signed into an existing vendor account with ID already on file.
        if (hasAccount) {
          identityOnFile = await loadProfile(uid, !resubmit);
          if (identityOnFile && !resubmit) return;
        }
      }

      const invalid = validateVendor();
      if (invalid) return fail(invalid);
      const isCompany = vendorType === "company";

      // Only changed identity fields are written — merge keeps the rest.
      const identity: Record<string, unknown> = { verified: false };
      if (isCompany) {
        if (files.companyDoc) identity.companyDoc = await upload(uid, "company", files.companyDoc);
      } else {
        identity.ghanaCard = form.ghanaCard;
        if (files.front) identity.ghanaCardFrontUrl = await upload(uid, "id-front", files.front);
        if (files.back) identity.ghanaCardBackUrl = await upload(uid, "id-back", files.back);
      }

      if (auth.currentUser && !auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: form.fullName.trim() });
      }
      const userRef = doc(db, "users", uid);
      const isNewDoc = !(await getDoc(userRef)).exists();
      await setDoc(
        userRef,
        {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: auth.currentUser?.email || form.email.trim(),
          vendorType,
          identity,
          ...(isCompany && {
            contactPerson: {
              name: form.contactName,
              position: form.contactPosition,
              phone: form.contactPhone,
              email: form.contactEmail,
            },
          }),
          ...(isNewDoc && { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );

      if (resubmit) {
        await updateDoc(doc(db, "stores", resubmit), { onboardingStatus: "pending" });
        queryClient.invalidateQueries({ queryKey: ["vendor-owned-stores"] });
        showAlert({
          title: "Resubmitted",
          message: "Thanks. We'll review your store again and notify you.",
          type: "success",
          singleButton: true,
          onConfirm: () => router.back(),
        });
        return;
      }
      setStep(2);
    } catch (e) {
      console.error(e);
      fail(getErrorMessage(e) || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: store ---
  const handleStoreSubmit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return setStep(1);
    const slug = form.storeSlug;
    if (form.storeName.trim().length < 2) return fail("Enter your store's name.");
    if (!/^[a-z0-9-]{3,}$/.test(slug)) return fail("Store URL needs at least 3 letters or numbers.");
    if (!agreedTerms || !agreedPrivacy) return fail("Accept the Terms of Service and Privacy Policy to continue.");

    setLoading(true);
    try {
      const storeRef = doc(db, "stores", slug);
      if ((await getDoc(storeRef)).exists()) return fail("That store URL is taken. Try another.");

      // Checked before the store exists so a bad code can still be fixed.
      if (form.referralCode.trim()) {
        await httpsCallable(functions, "redeemReferralCode")({ code: form.referralCode });
      }

      const storeType = form.storeType;
      await setDoc(storeRef, {
        name: form.storeName.trim(),
        slug,
        category: form.category,
        type: storeType,
        features: {
          hasProducts: storeType === "product" || storeType === "hybrid",
          hasServices: storeType === "service" || storeType === "hybrid",
          hasPreorders: storeType === "hybrid",
        },
        ownerId: uid,
        status: "closed",
        onboardingStatus: "pending",
        isVerified: false,
        isSuspended: false,
        plan: "starter",
        createdAt: serverTimestamp(),
        theme: {
          primaryColor: "#000000",
          heroText: `WELCOME TO ${form.storeName.trim().toUpperCase()}`,
          footerText: `© ${new Date().getFullYear()} ${form.storeName.trim()}`,
        },
      });
      await setDoc(doc(db, "users", uid), { ownedStores: arrayUnion(slug) }, { merge: true });

      await AsyncStorage.setItem("appMode", "vendor");
      // Remove, not invalidate: a cached empty list (from an earlier visit
      // to the vendor side with no store) would be served while refetching
      // and trip the vendor layout's no-store guard back to the shop.
      queryClient.removeQueries({ queryKey: ["vendor-owned-stores"] });
      showAlert({
        title: "Store submitted 🎉",
        message: "We're reviewing your details and will notify you once your store is approved. You can add products in the meantime.",
        type: "success",
        singleButton: true,
        confirmLabel: "Go to my store",
        onConfirm: () => router.replace("/(vendor)/(tabs)/dashboard" as Href),
      });
    } catch (e) {
      console.error(e);
      fail(getErrorMessage(e) || "Couldn't create your store. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  const docTile = (key: keyof typeof files, label: string, allowPdf = false) => {
    const picked = files[key];
    const saved = onFile[key];
    return (
      <Pressable
        onPress={() => chooseFile(key, allowPdf)}
        className="flex-1 border-2 border-dashed border-zinc-200 rounded-2xl p-4 items-center justify-center bg-zinc-50 min-h-[96px]"
      >
        {picked ? (
          <>
            <FileText size={20} color="black" />
            <P className="text-[11px] font-bold mt-1 text-center" numberOfLines={1}>
              {picked.name}
            </P>
          </>
        ) : saved ? (
          <>
            <Check size={20} color="#16a34a" />
            <P className="text-[11px] font-bold mt-1 text-green-700">On file · tap to replace</P>
          </>
        ) : (
          <>
            <Upload size={20} color="#a1a1aa" />
            <P className="text-[11px] font-bold mt-1 text-zinc-400 uppercase tracking-widest">{label}</P>
          </>
        )}
      </Pressable>
    );
  };

  const chip = (active: boolean, label: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      className={`px-4 py-2.5 rounded-full border ${active ? "bg-black border-black" : "bg-white border-zinc-200"}`}
    >
      <P className={`text-xs font-bold ${active ? "text-white" : "text-zinc-600"}`}>{label}</P>
    </Pressable>
  );

  const checkbox = (checked: boolean, toggle: () => void, text: string, link: string, url: string) => (
    <View className="flex-row items-start gap-3">
      <Pressable
        onPress={toggle}
        hitSlop={8}
        className={`w-5 h-5 rounded border items-center justify-center mt-0.5 ${checked ? "bg-black border-black" : "border-zinc-300"}`}
      >
        {checked && <Check size={14} color="white" />}
      </Pressable>
      <P className="flex-1 text-xs text-zinc-600 leading-5">
        {text}{" "}
        <P className="text-xs font-bold text-black underline" onPress={() => openWebPage(url)}>
          {link}
        </P>
      </P>
    </View>
  );

  const label = (text: string) => (
    <P className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">{text}</P>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => (step === 2 && !resubmit ? setStep(1) : router.back())}
            className="w-10 h-10 bg-zinc-100 rounded-full items-center justify-center mb-6"
          >
            <ArrowLeft size={20} color="black" />
          </Pressable>

          <H1 className="uppercase tracking-tighter">{resubmit ? "Update & Resubmit" : "Open Your Store."}</H1>
          <P className="text-zinc-500 mb-4">
            {resubmit
              ? "Update what our team asked for, then resubmit for review."
              : `Step ${step} of 2: ${step === 1 ? "Vendor details" : "Store setup"}`}
          </P>
          {!resubmit && (
            <View className="h-1.5 bg-zinc-100 rounded-full mb-6 overflow-hidden">
              <View className="h-full bg-black rounded-full" style={{ width: step === 1 ? "50%" : "100%" }} />
            </View>
          )}

          {step === 1 ? (
            <View>
              {!signedIn && (
                <View className="mb-2">
                  {label(hasAccount ? "Sign in" : "Create your account")}
                  <Input
                    placeholder="Email"
                    value={form.email}
                    onChangeText={set("email")}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Input placeholder="Password" value={form.password} onChangeText={set("password")} secureTextEntry />
                  <Pressable onPress={() => setHasAccount((h) => !h)} className="mb-5 -mt-2">
                    <P className="text-xs text-zinc-500">
                      {hasAccount ? "New here? " : "Already have an account? "}
                      <P className="text-xs font-bold text-black">{hasAccount ? "Create one" : "Sign in"}</P>
                    </P>
                  </Pressable>
                </View>
              )}

              {!resubmit && (
                <View className="flex-row bg-zinc-100 rounded-2xl p-1 mb-5">
                  {(["individual", "company"] as const).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setVendorType(t)}
                      className={`flex-1 flex-row gap-2 py-3 rounded-xl items-center justify-center ${vendorType === t ? "bg-white" : ""}`}
                    >
                      {t === "individual" ? (
                        <UserIcon size={16} color={vendorType === t ? "black" : "#a1a1aa"} />
                      ) : (
                        <Building2 size={16} color={vendorType === t ? "black" : "#a1a1aa"} />
                      )}
                      <P className={`text-xs font-black uppercase tracking-widest ${vendorType === t ? "text-black" : "text-zinc-400"}`}>
                        {t}
                      </P>
                    </Pressable>
                  ))}
                </View>
              )}

              <Input
                label={vendorType === "company" ? "Company legal name" : "Legal full name"}
                placeholder={vendorType === "company" ? "e.g. My Brand Ltd" : "e.g. Kwame Mensah"}
                value={form.fullName}
                onChangeText={set("fullName")}
              />
              <Input label="Phone number" placeholder="054xxxxxxx" keyboardType="phone-pad" value={form.phone} onChangeText={set("phone")} />

              {vendorType === "individual" ? (
                <>
                  <Input
                    label="Ghana Card (NIA)"
                    placeholder="GHA-XXXXXXXXX-X"
                    value={form.ghanaCard}
                    onChangeText={(t) => set("ghanaCard")(formatGhanaCard(t.toUpperCase()))}
                    onFocus={() => !form.ghanaCard && set("ghanaCard")("GHA-")}
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                  {label("Ghana Card photos")}
                  <View className="flex-row gap-3 mb-5">
                    {docTile("front", "Front")}
                    {docTile("back", "Back")}
                  </View>
                </>
              ) : (
                <>
                  {label("Registration certificate (photo or PDF)")}
                  <View className="flex-row mb-5">{docTile("companyDoc", "Upload", true)}</View>
                  <Input label="Contact person" placeholder="Full name" value={form.contactName} onChangeText={set("contactName")} />
                  <Input placeholder="Position" value={form.contactPosition} onChangeText={set("contactPosition")} />
                  <Input placeholder="Contact phone" keyboardType="phone-pad" value={form.contactPhone} onChangeText={set("contactPhone")} />
                  <Input
                    placeholder="Contact email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.contactEmail}
                    onChangeText={set("contactEmail")}
                  />
                </>
              )}

              <Button
                title={resubmit ? "Resubmit for review" : signedIn || !hasAccount ? "Next step" : "Sign in & continue"}
                onPress={handleVendorSubmit}
                loading={loading}
                disabled={loading}
              />
            </View>
          ) : (
            <View>
              <Input label="Store name" placeholder="e.g. Vintage Vibes" value={form.storeName} onChangeText={set("storeName")} />
              <Input
                label="Store URL"
                placeholder="your-store"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.storeSlug}
                onChangeText={(t) => set("storeSlug")(slugify(t))}
              />
              <P className="text-[11px] text-zinc-400 -mt-3 mb-5 ml-1">copdrop.io/shop/{form.storeSlug || "your-store"}</P>

              {label("Category")}
              <View className="flex-row flex-wrap gap-2 mb-5">
                {CATEGORIES.map((c) => chip(form.category === c.value, c.label, () => set("category")(c.value)))}
              </View>

              {label("What will you sell?")}
              <View className="flex-row flex-wrap gap-2 mb-5">
                {STORE_TYPES.map((t) => chip(form.storeType === t.value, t.label, () => set("storeType")(t.value)))}
              </View>

              <Input
                label="Referral code (optional)"
                placeholder="e.g. K7M2QX"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                value={form.referralCode}
                onChangeText={set("referralCode")}
              />
              <P className="text-[11px] text-zinc-400 -mt-3 mb-5 ml-1">
                Got a code from another vendor? You both get an extra month of Growth once your store is approved.
              </P>

              <View className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mb-5">
                <P className="font-black text-xs uppercase tracking-widest mb-1">30-Day Growth Trial</P>
                <P className="text-xs text-zinc-500 leading-5">
                  New vendors start with a free month of Growth: 2% fees and a verified badge once approved. After that
                  you move to Starter (8% fees) unless you upgrade.
                </P>
              </View>

              <View className="gap-3 mb-6">
                {checkbox(agreedTerms, () => setAgreedTerms((v) => !v), "I agree to The Drop's", "Terms of Service", LEGAL_URLS.terms)}
                {checkbox(agreedPrivacy, () => setAgreedPrivacy((v) => !v), "I have read and accept the", "Privacy Policy", LEGAL_URLS.privacy)}
              </View>

              <Button
                title="Launch store"
                onPress={handleStoreSubmit}
                loading={loading}
                disabled={loading || !agreedTerms || !agreedPrivacy}
              />
            </View>
          )}
          {loading && step === 1 && (
            <P className="text-xs text-zinc-400 text-center mt-3">Uploading your documents…</P>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
