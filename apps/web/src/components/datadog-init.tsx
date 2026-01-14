"use client";

import { datadogRum } from "@datadog/browser-rum";
import { useEffect } from "react";

export default function DatadogInit() {
  useEffect(() => {
    datadogRum.init({
      applicationId: process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID || "",
      clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN || "",
      site: process.env.NEXT_PUBLIC_DATADOG_SITE || "us5.datadoghq.com",
      service: process.env.NEXT_PUBLIC_DATADOG_SERVICE || "influencer-drop",
      env: process.env.NEXT_PUBLIC_DATADOG_ENV || "production",
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: "mask-user-input",
    });

    datadogRum.startSessionReplayRecording();
  }, []);

  return null;
}
