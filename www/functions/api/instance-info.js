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
    
      // Fetch the stats information
      const statsInfo = await getServletStats(host);

      
      // Return the replication information
      return new Response(JSON.stringify({
        replication: replicationInfo,
        stats: statsInfo
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

/**
 * Fetches the servlet statistics for a given host
 * 
 * @param {string} host - The host to fetch statistics information for
 * @returns {Object} - The parsed statistics information
 */
async function getServletStats(host) {
  try {
    // Construct the URL for fetching statistics information
    const statsUrl = `https://${host}/stats.do`;
    
    // Fetch the statistics information
    const response = await fetch(statsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch statistics information: ${response.status} ${response.statusText}`);
    }
    
    // Get the HTML content
    const htmlContent = await response.text();
    
    // Parse the HTML content
    return parseStatsHtml(htmlContent);
    
  } catch (error) {
    console.error("Error fetching statistics information:", error);
    throw error;
  }
}

/**
 * Parses the HTML content from stats.do into a structured object
 * 
 * @param {string} htmlContent - The HTML content from stats.do
 * @returns {Object} - A structured object containing the parsed statistics
 */
function parseStatsHtml(htmlContent) {
  const statsInfo = {};
  
  // Extract basic information
  const instanceNameMatch = htmlContent.match(/Instance name: ([^<]+)/);
  if (instanceNameMatch) {
    statsInfo.instanceName = instanceNameMatch[1].trim();
  }
  
  const instanceStateMatch = htmlContent.match(/Instance State: ([^<]+)/);
  if (instanceStateMatch) {
    statsInfo.instanceState = instanceStateMatch[1].trim();
  }
  
  const buildNameMatch = htmlContent.match(/Build name: ([^<]+)/);
  if (buildNameMatch) {
    statsInfo.buildName = buildNameMatch[1].trim();
  }
  
  const buildDateMatch = htmlContent.match(/Build date: ([^<]+)/);
  if (buildDateMatch) {
    statsInfo.buildDate = buildDateMatch[1].trim();
  }
  
  const buildTagMatch = htmlContent.match(/Build tag: ([^<]+)/);
  if (buildTagMatch) {
    statsInfo.buildTag = buildTagMatch[1].trim();
  }
  
  const clusterNodeMatch = htmlContent.match(/Connected to cluster node: ([^<]+)/);
  if (clusterNodeMatch) {
    statsInfo.clusterNode = clusterNodeMatch[1].trim();
  }
  
  const runLevelMatch = htmlContent.match(/Current Run Level: ([^<]+)/);
  if (runLevelMatch) {
    statsInfo.runLevel = runLevelMatch[1].trim();
  }
  
  // Parse memory information
  statsInfo.memory = {};
  const maxMemoryMatch = htmlContent.match(/Max memory: ([^<]+)/);
  if (maxMemoryMatch) {
    statsInfo.memory.max = parseFloat(maxMemoryMatch[1].trim());
  }
  
  const allocatedMemoryMatch = htmlContent.match(/Allocated: ([^<]+)/);
  if (allocatedMemoryMatch) {
    statsInfo.memory.allocated = parseFloat(allocatedMemoryMatch[1].trim());
  }
  
  const usedMemoryMatch = htmlContent.match(/In use: ([^<]+)/);
  if (usedMemoryMatch) {
    statsInfo.memory.inUse = parseFloat(usedMemoryMatch[1].trim());
  }
  
  const freePercentageMatch = htmlContent.match(/Free percentage: ([^<]+)/);
  if (freePercentageMatch) {
    statsInfo.memory.freePercentage = parseFloat(freePercentageMatch[1].trim());
  }
  
  // Parse servlet statistics
  statsInfo.servletStats = {};
  
  const startedMatch = htmlContent.match(/Started: ([^<]+)/);
  if (startedMatch) {
    statsInfo.servletStats.started = startedMatch[1].trim();
  }
  
  const cacheBuiltMatch = htmlContent.match(/Cache built: ([^,]+), flushes: (\d+)/);
  if (cacheBuiltMatch) {
    statsInfo.servletStats.cacheBuilt = cacheBuiltMatch[1].trim();
    statsInfo.servletStats.cacheFlushes = parseInt(cacheBuiltMatch[2].trim());
  }
  
  const transactionsMatch = htmlContent.match(/Transactions: ([^<]+)/);
  if (transactionsMatch) {
    statsInfo.servletStats.transactions = parseInt(transactionsMatch[1].trim().replace(/,/g, ''));
  }
  
  const errorsHandledMatch = htmlContent.match(/Errors handled: ([^<]+)/);
  if (errorsHandledMatch) {
    statsInfo.servletStats.errorsHandled = parseInt(errorsHandledMatch[1].trim().replace(/,/g, ''));
  }
  
  const processorTransactionsMatch = htmlContent.match(/Processor transactions: ([^<]+)/);
  if (processorTransactionsMatch) {
    statsInfo.servletStats.processorTransactions = parseInt(processorTransactionsMatch[1].trim().replace(/,/g, ''));
  }
  
  const cancelledTransactionsMatch = htmlContent.match(/Cancelled transactions: ([^<]+)/);
  if (cancelledTransactionsMatch) {
    statsInfo.servletStats.cancelledTransactions = parseInt(cancelledTransactionsMatch[1].trim().replace(/,/g, ''));
  }
  
  const loggedInSessionsMatch = htmlContent.match(/Logged in sessions: (\d+) \((\d+) active\)/);
  if (loggedInSessionsMatch) {
    statsInfo.servletStats.loggedInSessions = parseInt(loggedInSessionsMatch[1].trim());
    statsInfo.servletStats.activeSessions = parseInt(loggedInSessionsMatch[2].trim());
  }
  
  const sessionTimeoutMatch = htmlContent.match(/Session timeout: (\d+) minutes/);
  if (sessionTimeoutMatch) {
    statsInfo.servletStats.sessionTimeout = parseInt(sessionTimeoutMatch[1].trim());
  }
  
  // Parse database connection pools
  statsInfo.dbConnections = [];
  const dbConnectionPattern = /Status: ([^\n<]+)[\s\S]*?Busy: (\d+)[\s\S]*?Closed: (\d+)[\s\S]*?Available: (\d+)[\s\S]*?Total: (\d+)[\s\S]*?Max: (\d+)/g;
  
  let dbMatch;
  while ((dbMatch = dbConnectionPattern.exec(htmlContent)) !== null) {
    statsInfo.dbConnections.push({
      status: dbMatch[1].trim(),
      busy: parseInt(dbMatch[2]),
      closed: parseInt(dbMatch[3]),
      available: parseInt(dbMatch[4]),
      total: parseInt(dbMatch[5]),
      max: parseInt(dbMatch[6])
    });
  }
  
  // Parse semaphore sets
  statsInfo.semaphoreSets = {};
  const semaphoreSetPattern = /<b>([^<]+)<\/b><br\/>Available semaphores: (\d+)<br\/>Queue depth: ([^<]+)<br\/>Queue age: ([^<]+)<br\/>Max queue depth: (\d+)/g;
  
  let semaphoreMatch;
  while ((semaphoreMatch = semaphoreSetPattern.exec(htmlContent)) !== null) {
    const setName = semaphoreMatch[1].trim();
    statsInfo.semaphoreSets[setName] = {
      availableSemaphores: parseInt(semaphoreMatch[2]),
      queueDepth: semaphoreMatch[3].trim().startsWith('<a') ? parseInt(semaphoreMatch[3].match(/'>(\d+)</)[1]) : parseInt(semaphoreMatch[3]),
      queueAge: semaphoreMatch[4].trim(),
      maxQueueDepth: parseInt(semaphoreMatch[5])
    };
  }
  
  // Parse scheduler information
  statsInfo.scheduler = {};
  
  const workerCountMatch = htmlContent.match(/Number of workers: (\d+)/);
  if (workerCountMatch) {
    statsInfo.scheduler.workerCount = parseInt(workerCountMatch[1]);
  }
  
  const queueLengthMatch = htmlContent.match(/Queue length: (\d+)/);
  if (queueLengthMatch) {
    statsInfo.scheduler.queueLength = parseInt(queueLengthMatch[1]);
  }
  
  const totalJobsMatch = htmlContent.match(/Total jobs: (\d+)/);
  if (totalJobsMatch) {
    statsInfo.scheduler.totalJobs = parseInt(totalJobsMatch[1].replace(/,/g, ''));
  }
  
  // Parse server response time
  statsInfo.responseTime = {};
  const responseTimePattern = /(\d+ minute): ([\d:\.]+) \((\d+) transactions, ([\d\.]+) per minute/g;
  
  let responseTimeMatch;
  while ((responseTimeMatch = responseTimePattern.exec(htmlContent.split('<strong>Server Response Time</strong>')[1].split('<hr/>')[0])) !== null) {
    const timeFrame = responseTimeMatch[1].trim();
    statsInfo.responseTime[timeFrame] = {
      averageTime: responseTimeMatch[2].trim(),
      transactions: parseInt(responseTimeMatch[3]),
      transactionsPerMinute: parseFloat(responseTimeMatch[4])
    };
  }
  
  return statsInfo;
}