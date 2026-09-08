import axios from "axios";
import * as functions from "firebase-functions";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export const resolveAccount = async (
  accountNumber: string,
  bankCode: string
) => {
  try {
    const response = await paystack.get(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (Resolve):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "invalid-argument",
      error.response?.data?.message || "Could not resolve account details"
    );
  }
};

export const createRecipient = async (data: {
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}) => {
  try {
    const response = await paystack.post("/transferrecipient", {
      type: data.type,
      name: data.name,
      account_number: data.account_number,
      bank_code: data.bank_code,
      currency: "GHS",
    });
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (Create Recipient):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      error.response?.data?.message || "Could not create transfer recipient"
    );
  }
};

export const listBanks = async () => {
  try {
    const response = await paystack.get("/bank?currency=GHS");
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (List Banks):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError("internal", "Could not fetch banks");
  }
};

export const initiateTransfer = async (
  amount: number,
  recipient: string,
  reason: string = "Vendor Payout"
) => {
  try {
    const response = await paystack.post("/transfer", {
      source: "balance",
      amount,
      recipient,
      reason,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Paystack Transfer Error:",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      error.response?.data?.message || "Failed to initiate transfer"
    );
  }
};

export const createSubaccount = async (data: {
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number;
}) => {
  try {
    const response = await paystack.post("/subaccount", {
      business_name: data.business_name,
      settlement_bank: data.bank_code,
      account_number: data.account_number,
      percentage_charge: data.percentage_charge,
    });
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (Create Subaccount):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      error.response?.data?.message || "Could not create subaccount"
    );
  }
};

export const updateSubaccount = async (
  code: string,
  data: { percentage_charge?: number; active?: boolean }
) => {
  try {
    const response = await paystack.put(`/subaccount/${code}`, data);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (Update Subaccount):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      error.response?.data?.message || "Could not update subaccount"
    );
  }
};

export const verifyTransaction = async (reference: string) => {
  try {
    const response = await paystack.get(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (Verify Transaction):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      error.response?.data?.message || "Could not verify transaction"
    );
  }
};

export const initializeTransaction = async (data: {
  email: string;
  amount: number; // kobo/pesewas
  reference: string;
  subaccount?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    const response = await paystack.post("/transaction/initialize", data);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack API Error (Initialize Transaction):",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      error.response?.data?.message || "Could not initialize transaction"
    );
  }
};
