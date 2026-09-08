import axios from "axios";
import * as functions from "firebase-functions";
import { getAxiosErrorData, getAxiosErrorApiMessage } from "./errors";

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
  } catch (error) {
    console.error("Paystack API Error (Resolve):", getAxiosErrorData(error));
    throw new functions.https.HttpsError(
      "invalid-argument",
      getAxiosErrorApiMessage(error, "Could not resolve account details")
    );
  }
};

export const listBanks = async () => {
  try {
    const response = await paystack.get("/bank?currency=GHS");
    return response.data.data;
  } catch (error) {
    console.error("Paystack API Error (List Banks):", getAxiosErrorData(error));
    throw new functions.https.HttpsError("internal", "Could not fetch banks");
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
  } catch (error) {
    console.error(
      "Paystack API Error (Create Subaccount):",
      getAxiosErrorData(error)
    );
    throw new functions.https.HttpsError(
      "internal",
      getAxiosErrorApiMessage(error, "Could not create subaccount")
    );
  }
};

export const updateSubaccount = async (
  code: string,
  data: {
    percentage_charge?: number;
    active?: boolean;
    bank_code?: string;
    account_number?: string;
  }
) => {
  try {
    const response = await paystack.put(`/subaccount/${code}`, data);
    return response.data.data;
  } catch (error) {
    console.error(
      "Paystack API Error (Update Subaccount):",
      getAxiosErrorData(error)
    );
    throw new functions.https.HttpsError(
      "internal",
      getAxiosErrorApiMessage(error, "Could not update subaccount")
    );
  }
};

export const verifyTransaction = async (reference: string) => {
  try {
    const response = await paystack.get(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
    return response.data.data;
  } catch (error) {
    console.error(
      "Paystack API Error (Verify Transaction):",
      getAxiosErrorData(error)
    );
    throw new functions.https.HttpsError(
      "internal",
      getAxiosErrorApiMessage(error, "Could not verify transaction")
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
  } catch (error) {
    console.error(
      "Paystack API Error (Initialize Transaction):",
      getAxiosErrorData(error)
    );
    throw new functions.https.HttpsError(
      "internal",
      getAxiosErrorApiMessage(error, "Could not initialize transaction")
    );
  }
};
