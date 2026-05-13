/**
 * Cloudflare Pages Function: returns the ServiceNow version
 * for a given instance URL.
 *
 * POST body: { "url": "https://<instance>.service-now.com" }
 */
export async function onRequestPost(context) {
  const { request } = context;

  try {
    const requestBody = await request.json();

    if (!requestBody.url) {
      return jsonResponse({ error: "Missing 'url' in request body" }, 400);
    }

    const host = new URL(requestBody.url).hostname;
    if (!host) {
      return jsonResponse({ error: "Could not extract host from URL" }, 400);
    }

    const userAgent = request.headers.get("User-Agent");
    const version = await getServiceNowVersion(host, userAgent);
    return jsonResponse(version, 200);

  } catch (error) {
    console.error("Error processing request:", error);
    return jsonResponse(
      { error: error.message || "An error occurred processing the request" },
      500
    );
  }
}

/**
 * Fetches the version info from <host>/BINGBONG.do
 * Returns only the buildName, omitting mobileVersion.
 */
async function getServiceNowVersion(host, userAgent) {
  const url = `https://${host}/angular.do?sysparm_type=instance_info&type=get_info`;

  const headers = { Accept: "application/json" };
  if (userAgent) headers["User-Agent"] = userAgent;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch version: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const { mobileVersion, ...rest } = data;
  return rest;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

