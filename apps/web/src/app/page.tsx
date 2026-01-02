import { PlatformLandingClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Own the Hype. The all-in-one platform for stores to launch exclusive drops.",
};

export default function PlatformLanding() {
  return <PlatformLandingClient />;
}
