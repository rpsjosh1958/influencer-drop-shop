import { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useAlert } from "@/context/alert-context";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import {
  User,
  MapPin,
  Lock,
  LogOut,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Mail,
  Smartphone,
  CreditCard,
  MoreVertical,
  Eye,
  EyeOff,
  Store,
  Zap,
} from "lucide-react-native";
import { MotiView } from "moti";
import { StatusBar } from "expo-status-bar";
import { Country, City } from "country-state-city";
import { SelectionModal } from "@/components/ui/selection-modal";
import { ComplaintModal } from "@/components/shop/complaint-modal"; // Added
import { AlertCircle } from "lucide-react-native"; // Added
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<
    "menu" | "personal" | "addresses" | "security"
  >("menu");
  const [saving, setSaving] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false); // Added

  // Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);

  // Security State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Address Form
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState({
    country: "GH", // Default to Ghana ISO Code
    city: "",
    street: "",
    zip: "",
  });

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Data Memos
  const countryOptions = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        label: c.name,
        value: c.isoCode,
      })),
    [],
  );

  const cityOptions = useMemo(() => {
    if (!newAddr.country) return [];
    return (
      City.getCitiesOfCountry(newAddr.country)?.map((c) => ({
        label: c.stateCode ? `${c.name} (${c.stateCode})` : c.name,
        value: c.name,
      })) || []
    );
  }, [newAddr.country]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setName(u.displayName || "");
        await fetchProfile(u.uid);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setPhone(data.phone || "");
        setAddresses(data.addresses || []);
      }
    } catch (e) {
      console.log("Error fetching profile", e);
    }
  };

  const { showAlert } = useAlert();

  const handleSignOut = () => {
    showAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Sign Out",
      type: "error",
      onConfirm: async () => {
        try {
          await signOut(auth);
          // router.replace("/(tabs)");
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const updatePersonalInfo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: name });
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: name,
          phone,
        },
        { merge: true },
      );
      showAlert({
        title: "Success",
        message: "Profile updated successfully.",
        type: "success",
      });
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Failed to update profile.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    if (!newAddr.street)
      return showAlert({
        title: "Missing Information",
        message: "Please enter a street address.",
        type: "error",
      });

    setSaving(true);
    try {
      let updatedAddresses = [...addresses];

      if (editingAddressId) {
        // Update existing
        updatedAddresses = addresses.map((addr) =>
          addr.id === editingAddressId ? { ...addr, ...newAddr } : addr,
        );
      } else {
        // Add new
        const addressToAdd = {
          id: Date.now().toString(),
          ...newAddr,
          isDefault: addresses.length === 0,
        };
        updatedAddresses.push(addressToAdd);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: updatedAddresses,
        },
        { merge: true },
      );

      setAddresses(updatedAddresses);
      setAddingAddress(false);
      setEditingAddressId(null);
      setNewAddr({ country: "Ghana", city: "Accra", street: "", zip: "" });
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Could not save address.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    if (!user) return;
    try {
      const updatedAddresses = addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === addrId,
      }));

      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: updatedAddresses,
        },
        { merge: true },
      );
      setAddresses(updatedAddresses);
      showAlert({
        title: "Success",
        message: "Default address updated.",
        type: "success",
      });
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Failed to set default address.",
        type: "error",
      });
    }
  };

  const handleEditAddress = (addr: any) => {
    setNewAddr({
      country: addr.country,
      city: addr.city,
      street: addr.street,
      zip: addr.zip || "",
    });
    setEditingAddressId(addr.id);
    setAddingAddress(true);
  };

  const handleRemoveAddress = async (addr: any) => {
    if (!user) return;
    showAlert({
      title: "Remove Address",
      message: "Are you sure you want to remove this address?",
      confirmLabel: "Remove",
      type: "error",
      onConfirm: async () => {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              addresses: arrayRemove(addr),
            },
            { merge: true },
          );
          setAddresses(addresses.filter((a) => a.id !== addr.id));
        } catch (e) {
          showAlert({
            title: "Error",
            message: "Failed to remove address.",
            type: "error",
          });
        }
      },
    });
  };

  const showAddressOptions = (addr: any) => {
    const options = ["Edit", "Remove", "Cancel"];
    if (!addr.isDefault) {
      options.unshift("Set as Default");
    }

    const destructiveButtonIndex = options.indexOf("Remove");
    const cancelButtonIndex = options.indexOf("Cancel");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          const selectedOption = options[buttonIndex];
          if (selectedOption === "Set as Default") {
            handleSetDefaultAddress(addr.id);
          } else if (selectedOption === "Edit") {
            handleEditAddress(addr);
          } else if (selectedOption === "Remove") {
            handleRemoveAddress(addr);
          }
        },
      );
    } else {
      // Android / Other Alert fallback
      Alert.alert(
        "Address Options",
        `options for ${addr.street}`,
        [
          !addr.isDefault
            ? {
                text: "Set Default",
                onPress: () => handleSetDefaultAddress(addr.id),
              }
            : (null as any),
          { text: "Edit", onPress: () => handleEditAddress(addr) },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => handleRemoveAddress(addr),
          },
          { text: "Cancel", style: "cancel" },
        ].filter(Boolean),
      );
    }
  };

  const changePassword = async () => {
    if (!user || !newPassword || !oldPassword) {
      return showAlert({
        title: "Missing Information",
        message: "Please enter current and new passwords.",
        type: "error",
      });
    }
    setSaving(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);
      showAlert({
        title: "Success",
        message: "Password updated successfully.",
        type: "success",
      });
      setNewPassword("");
      setOldPassword("");
    } catch (e: any) {
      if (
        e.code === "auth/wrong-password" ||
        e.code === "auth/invalid-credential"
      ) {
        showAlert({
          title: "Incorrect Password",
          message:
            "The current password you entered is incorrect. Please try again.",
          type: "error",
        });
      } else if (e.code === "auth/requires-recent-login") {
        showAlert({
          title: "Security Check",
          message: "Please re-login to change password.",
          type: "error",
          onConfirm: handleSignOut,
          confirmLabel: "Sign Out",
        });
      } else {
        showAlert({
          title: "Error",
          message: e.message,
          type: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleServicesSwitch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Check if user has a store
      const storeQuery = query(
        collection(db, "stores"),
        where("ownerId", "==", user.uid),
        limit(1),
      );
      const snapshot = await getDocs(storeQuery);

      if (!snapshot.empty) {
        // 2. IS VENDOR -> Redirect to Admin
        router.replace("/(vendor)/(tabs)/dashboard" as any);
      } else {
        // 3. NOT VENDOR -> Prompt to Create
        Alert.alert(
          "Become a Seller",
          "You need a store to access the seller portal. Create one on our website!",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Create Store",
              onPress: () =>
                Linking.openURL(
                  "https://thedrop-admin.vercel.app/create-store",
                ), // Replace with actual URL if known, assuming prod/dev URL
            },
          ],
        );
      }
    } catch (e) {
      console.error(e);
      showAlert({
        title: "Error",
        message: "Failed to switch mode.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelAddressEdit = () => {
    setAddingAddress(false);
    setEditingAddressId(null);
    setNewAddr({ country: "Ghana", city: "Accra", street: "", zip: "" });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />
        <SafeAreaView className="flex-1 px-6 justify-center items-center">
          <View className="w-24 h-24 bg-zinc-100 rounded-full items-center justify-center mb-8">
            <User size={40} color="#71717a" />
          </View>
          <H1 className="text-3xl font-black text-center mb-2">
            NOT LOGGED IN
          </H1>
          <P className="text-zinc-500 text-center mb-8">
            Sign in to manage your profile, track orders, and save your
            preferences.
          </P>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="bg-black w-full py-4 rounded-xl items-center"
          >
            <P className="text-white font-bold uppercase tracking-wider">
              Sign In
            </P>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            className="mt-4"
          >
            <P className="text-zinc-500 font-bold">Create an account</P>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(auth)/login",
                params: { intent: "vendor" },
              })
            }
            className="mt-8 py-2 px-4 bg-zinc-100 rounded-lg"
          >
            <P className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
              Login to Vendor Portal
            </P>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1  ">
        {/* Header */}
        <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center gap-4 bg-white z-10">
          {activeSection !== "menu" && (
            <MotiView
              from={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Pressable
                onPress={() => setActiveSection("menu")}
                className="p-2 bg-zinc-100 rounded-full"
              >
                <ChevronRight
                  size={20}
                  color="black"
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </Pressable>
            </MotiView>
          )}
          <H1 className="text-2xl font-black uppercase">
            {activeSection === "menu"
              ? "Profile"
              : activeSection.replace("_", " ")}
          </H1>
        </View>

        <View className="flex-1 bg-white">
          {activeSection === "menu" ? (
            <MotiView
              key="menu"
              from={{ opacity: 0, translateX: -50 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -50 }}
              transition={{ type: "timing", duration: 300 }}
              className="flex-1 p-6"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* User Card */}
                <View className="flex-row items-center gap-4 mb-10">
                  <View className="h-20 w-20 bg-zinc-100 rounded-full items-center justify-center border border-zinc-200">
                    <H1 className="text-2xl text-zinc-400">
                      {name?.[0] || user.email?.[0] || "?"}
                    </H1>
                  </View>
                  <View>
                    <H1 className="text-xl font-bold">{name || "User"}</H1>
                    <P className="text-zinc-500">{user.email}</P>
                  </View>
                </View>

                {/* Menu Items */}
                <View className="space-y-6">
                  <MenuItem
                    icon={User}
                    label="Personal Info"
                    onPress={() => setActiveSection("personal")}
                  />
                  <MenuItem
                    icon={MapPin}
                    label="Addresses"
                    onPress={() => setActiveSection("addresses")}
                  />
                  <MenuItem
                    icon={Lock}
                    label="Security"
                    onPress={() => setActiveSection("security")}
                  />
                  <MenuItem
                    icon={CreditCard}
                    label="My Orders"
                    onPress={() => router.push("/(tabs)/orders" as any)}
                  />
                  <MenuItem
                    icon={AlertCircle}
                    label="Report an Issue"
                    onPress={() => setIsComplaintOpen(true)}
                  />
                  <MenuItem
                    icon={Store}
                    label="Switch to Seller Mode"
                    onPress={handleServicesSwitch}
                  />
                  {/* DEV: Test Onboarding */}
                  {/* <MenuItem
                    icon={Zap}
                    label="[DEV] View Onboarding"
                    onPress={async () => {
                      await AsyncStorage.removeItem("hasSeenOnboarding");
                      router.replace("/(auth)/onboarding");
                    }}
                  /> */}
                </View>

                <Pressable
                  onPress={handleSignOut}
                  className="flex-row items-center gap-4 p-5  bg-zinc-50 rounded-2xl border border-zinc-100 active:scale-95 transition-transform"
                >
                  <View className="h-10 w-10 bg-red-100 rounded-full items-center justify-center">
                    <LogOut size={20} color="#ef4444" />
                  </View>
                  <P className="font-bold text-red-500 text-lg">Sign Out</P>
                </Pressable>
              </ScrollView>
            </MotiView>
          ) : (
            <MotiView
              key="section"
              from={{ opacity: 0, translateX: 50 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 50 }}
              transition={{ type: "timing", duration: 300 }}
              className="flex-1"
            >
              <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
                {activeSection === "personal" && (
                  <View className="space-y-6">
                    <InputGroup
                      label="Display Name"
                      value={name}
                      onChange={(t: string) => setName(t)}
                      placeholder="Your Name"
                    />
                    <InputGroup
                      label="Phone Number"
                      value={phone}
                      onChange={(t: string) => setPhone(t)}
                      placeholder="+233..."
                    />
                    <InputGroup label="Email" value={user.email} disabled />

                    <SaveButton onPress={updatePersonalInfo} loading={saving} />
                  </View>
                )}

                {activeSection === "addresses" && (
                  <View className="space-y-6">
                    {!addingAddress ? (
                      <>
                        {addresses.length === 0 ? (
                          <View className="p-8 bg-zinc-50 rounded-2xl items-center border border-dashed border-zinc-300 mb-6">
                            <P className="text-zinc-400 font-bold">
                              No addresses saved
                            </P>
                          </View>
                        ) : (
                          <View className="space-y-4 mb-6">
                            {addresses.map((addr, i) => (
                              <Pressable
                                key={i}
                                onPress={() => showAddressOptions(addr)}
                                className={`p-4 border mb-4 rounded-xl bg-white flex-row justify-between items-start active:bg-zinc-50 ${
                                  addr.isDefault
                                    ? "border-black"
                                    : "border-zinc-200"
                                }`}
                              >
                                <View className="flex-1">
                                  <View className="flex-row items-center gap-2 mb-1">
                                    <P className="font-bold">
                                      {addr.city},{" "}
                                      {countryOptions.find(
                                        (c) => c.value === addr.country,
                                      )?.label || addr.country}
                                    </P>
                                    {addr.isDefault && (
                                      <View className="bg-black px-2 py-1 rounded">
                                        <P className="text-white text-[10px] font-bold uppercase">
                                          Default
                                        </P>
                                      </View>
                                    )}
                                  </View>
                                  <P className="text-zinc-500">{addr.street}</P>
                                  <P className="text-xs text-zinc-400 mt-1">
                                    {addr.zip}
                                  </P>
                                </View>
                                <View className="p-2">
                                  <MoreVertical size={20} color="#a1a1aa" />
                                </View>
                              </Pressable>
                            ))}
                          </View>
                        )}
                        <Pressable
                          onPress={() => setAddingAddress(true)}
                          className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl flex-row items-center justify-center gap-2 active:bg-zinc-50"
                        >
                          <Plus size={20} color="#a1a1aa" />
                          <P className="font-bold text-zinc-400">
                            Add New Address
                          </P>
                        </Pressable>
                      </>
                    ) : (
                      <View className="space-y-6">
                        <H1 className="text-lg font-bold mb-4">
                          {editingAddressId ? "Edit Address" : "New Address"}
                        </H1>
                        <View className="mb-6">
                          <P className="text-xs font-bold uppercase text-zinc-400 mb-2 tracking-wider">
                            Country
                          </P>
                          <Pressable
                            onPress={() => setCountryModalVisible(true)}
                            className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex-row justify-between items-center"
                          >
                            <P className="font-bold text-base">
                              {countryOptions.find(
                                (c) => c.value === newAddr.country,
                              )?.label || "Select Country"}
                            </P>
                            <ChevronRight size={20} color="#a1a1aa" />
                          </Pressable>
                        </View>

                        <View className="mb-6">
                          <P className="text-xs font-bold uppercase text-zinc-400 mb-2 tracking-wider">
                            City
                          </P>
                          <Pressable
                            onPress={() => {
                              if (newAddr.country) setCityModalVisible(true);
                            }}
                            className={`w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex-row justify-between items-center ${
                              !newAddr.country ? "opacity-50" : ""
                            }`}
                          >
                            <P className="font-bold text-base">
                              {newAddr.city || "Select City"}
                            </P>
                            <ChevronRight size={20} color="#a1a1aa" />
                          </Pressable>
                        </View>

                        <SelectionModal
                          visible={countryModalVisible}
                          onClose={() => setCountryModalVisible(false)}
                          title="Select Country"
                          options={countryOptions}
                          onSelect={(val) =>
                            setNewAddr({ ...newAddr, country: val, city: "" })
                          }
                          selectedValue={newAddr.country}
                        />

                        <SelectionModal
                          visible={cityModalVisible}
                          onClose={() => setCityModalVisible(false)}
                          title="Select City"
                          options={cityOptions}
                          onSelect={(val) =>
                            setNewAddr({ ...newAddr, city: val })
                          }
                          selectedValue={newAddr.city}
                        />

                        <InputGroup
                          label="Street Address"
                          value={newAddr.street}
                          onChange={(t: string) =>
                            setNewAddr({ ...newAddr, street: t })
                          }
                        />
                        <InputGroup
                          label="Zip / Digital Address"
                          value={newAddr.zip}
                          onChange={(t: string) =>
                            setNewAddr({ ...newAddr, zip: t })
                          }
                        />

                        <View className="flex-row gap-4 pt-4">
                          <Pressable
                            onPress={cancelAddressEdit}
                            className="flex-1 py-4 bg-zinc-100 rounded-xl items-center"
                          >
                            <P className="font-bold">Cancel</P>
                          </Pressable>
                          <Pressable
                            onPress={handleSaveAddress}
                            className="flex-1 py-4 bg-black rounded-xl items-center"
                          >
                            {saving ? (
                              <ActivityIndicator color="white" />
                            ) : (
                              <P className="font-bold text-white">
                                {editingAddressId ? "Update" : "Save"}
                              </P>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {activeSection === "security" && (
                  <View className="space-y-6">
                    <InputGroup
                      label="Current Password"
                      value={oldPassword}
                      onChange={(t: string) => setOldPassword(t)}
                      placeholder="••••••••"
                      secure
                    />
                    <InputGroup
                      label="New Password"
                      value={newPassword}
                      onChange={(t: string) => setNewPassword(t)}
                      placeholder="••••••••"
                      secure
                    />
                    <SaveButton
                      onPress={changePassword}
                      loading={saving}
                      label="Update Password"
                    />
                  </View>
                )}
              </ScrollView>
            </MotiView>
          )}
        </View>

        <ComplaintModal
          visible={isComplaintOpen}
          onClose={() => setIsComplaintOpen(false)}
          storeId="store-id" // You might want to get this from context
          user={user}
          forcedTarget="platform"
        />
      </SafeAreaView>
    </View>
  );
}

function MenuItem({ icon: Icon, label, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row mb-2 items-center justify-between p-5 bg-zinc-50 rounded-2xl border border-zinc-100 active:scale-98 transition-transform"
    >
      <View className="flex-row items-center gap-4">
        <Icon size={22} color="black" />
        <P className="font-bold text-lg">{label}</P>
      </View>
      <ChevronRight size={20} color="#d4d4d8" />
    </Pressable>
  );
}

function InputGroup({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  secure,
}: any) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="mb-6">
      <P className="text-xs font-bold uppercase text-zinc-400 mb-2 tracking-wider">
        {label}
      </P>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          editable={!disabled}
          secureTextEntry={secure && !showPassword}
          className={`w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-base ${
            disabled ? "opacity-50" : ""
          } ${secure ? "pr-12" : ""}`}
          placeholderTextColor="#a1a1aa"
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-4"
          >
            {showPassword ? (
              <EyeOff size={20} color="#a1a1aa" />
            ) : (
              <Eye size={20} color="#a1a1aa" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SaveButton({ onPress, loading, label = "Save Changes" }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="bg-black w-full py-4 rounded-xl items-center mt-4 active:scale-95 transition-transform"
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <P className="text-white font-bold uppercase tracking-wider">{label}</P>
      )}
    </Pressable>
  );
}
