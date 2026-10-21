const value = process.env.EXPO_PUBLIC_API_URL;
try {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)
  )
    throw new Error();
} catch {
  console.error(
    "Set EXPO_PUBLIC_API_URL to the deployed public HTTPS auth API before building a release.",
  );
  process.exit(1);
}
console.log("Release API URL configuration passed.");
