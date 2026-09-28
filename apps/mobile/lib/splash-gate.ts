// Resolves once the animated splash has finished (app/_layout.tsx), so
// anything that would pop up over it at launch — like the notification
// permission prompt — can wait until the app is actually on screen.
let resolveSplashDone: () => void = () => {};
const splashDone = new Promise<void>((resolve) => {
  resolveSplashDone = resolve;
});

export const markSplashDone = () => resolveSplashDone();
export const whenSplashDone = () => splashDone;
