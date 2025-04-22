/**
 * Processes a request to fetch and parse ServiceNow replication information
 * 
 * @param {Request} request - The request object
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Context object
 * @returns {Response} - JSON response with replication information
 */
export async function onRequestPost(context) {
    const { request } = context;
    
    try {
      // Parse the request body to get the URL
      const requestBody = await request.json();
      
      if (!requestBody.url) {
        return new Response(JSON.stringify({ 
          error: "Missing 'url' in request body" 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Extract the host from the URL
      const urlObj = new URL(requestBody.url);
      const host = urlObj.hostname;
      
      if (!host) {
        return new Response(JSON.stringify({ 
          error: "Could not extract host from URL" 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Fetch the replication information
      const replicationInfo = await getReplicationInfo(host);
      
      // Return the replication information
      return new Response(JSON.stringify({
        replication: replicationInfo
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error("Error processing request:", error);
      
      return new Response(JSON.stringify({ 
        error: error.message || "An error occurred processing the request" 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  /**
   * Fetches the replication information for a given host
   * 
   * @param {string} host - The host to fetch replication information for
   * @returns {Object} - The parsed replication information
   */
  async function getReplicationInfo(host) {
    try {
      // Construct the URL for fetching replication information
      const replicationUrl = `https://${host}/replication.do`;
      
      // Fetch the replication information
      const response = await fetch(replicationUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch replication information: ${response.status} ${response.statusText}`);
      }
      
      // Get the HTML content
      const htmlContent = await response.text();
      
      // Parse the HTML content
      return parseServiceNowHtml(htmlContent);
      
    } catch (error) {
      console.error("Error fetching replication information:", error);
      throw error;
    }
  }
  
  /**
   * Parses HTML content to extract instance, cluster_node, db_name, db_type, db_conn and db_dbms
   * @param {string} htmlContent - The HTML content to parse
   * @returns {Object} - Object containing the extracted values
   */
  function parseServiceNowHtml(htmlContent) {
    // Create an object to store the extracted values
    const result = {
      instance: null,
      cluster_node: null,
      db_name: null,
      db_type: null,
      db_conn: null,
      db_dbms: null
    };
    
    // Extract instance from the replication status line
    const instanceMatch = htmlContent.match(/Replication status for: ([^\s]+)/);
    if (instanceMatch && instanceMatch[1]) {
      result.instance = instanceMatch[1];
    }
    
    // Extract cluster_node
    const clusterNodeMatch = htmlContent.match(/Connected to cluster node: ([^\s<]+)/);
    if (clusterNodeMatch && clusterNodeMatch[1]) {
      result.cluster_node = clusterNodeMatch[1];
    }
    
    // Extract db_name
    const dbNameMatch = htmlContent.match(/<b>Name<\/b>: ([^<]+)/);
    if (dbNameMatch && dbNameMatch[1]) {
      result.db_name = dbNameMatch[1];
    }
    
    // Extract db_type
    const dbTypeMatch = htmlContent.match(/<b>Type<\/b>: <[^>]+>([^<]+)/);
    if (dbTypeMatch && dbTypeMatch[1]) {
      result.db_type = dbTypeMatch[1];
    }
    
    // Extract db_conn
    const dbConnMatch = htmlContent.match(/<b>URL<\/b>: ([^<]+)/);
    if (dbConnMatch && dbConnMatch[1]) {
      result.db_conn = dbConnMatch[1];
    }
    
    // Determine db_dbms based on db_conn
    if (result.db_conn) {
      if (result.db_conn.includes('mysql')) {
        result.db_dbms = 'mariadb';
      } else if (result.db_conn.includes('postgres')) {
        result.db_dbms = 'raptordb';
      } else {
        result.db_dbms = 'unknown';
      }
    }
    
    return result;
  }