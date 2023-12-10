// Import the required libraries
const axios = require('axios'); // HTTP client for making requests
const cheerio = require('cheerio'); // Library for parsing HTML
const URL = require('url').URL; // URL module for parsing and formatting URLs
const fs = require('fs'); // File system module for file operations

// The starting URL for the crawler
const startUrl = 'https://www.railpass.com/';

// Set to store URLs we've already visited
const visited = new Set();

// Set to store URLs within the same domain
const sameDomainUrls = new Set();

// Function to start the crawling process
async function crawl(url) {
  // Check if the URL has already been visited
  if (visited.has(url)) return;

  // Add the URL to the visited set
  visited.add(url);

  // Make an HTTP GET request to the URL
  try {
    const response = await axios.get(url);

    // Load the HTML content into cheerio
    const $ = cheerio.load(response.data);

    // Find all anchor tags in the HTML
    $('a').each((index, element) => {
      // Extract the href attribute from the anchor tag
      const href = $(element).attr('href');

      // Create a complete URL from the href
      const fullUrl = new URL(href, url).href;

      // Check if the URL is within the same domain
      if (fullUrl.startsWith(startUrl)) {
        // Add the URL to the same domain set
        sameDomainUrls.add(fullUrl);

        // Recursively crawl the new URL
        crawl(fullUrl);
      }
    });
  } catch (error) {
    // Log any errors that occur during the request
    console.error(`Error crawling ${url}: `, error);
  }
}

// Start the crawler with the initial URL
crawl(startUrl).then(() => {
  // Convert the same domain URLs to an array
  const urlsArray = Array.from(sameDomainUrls);

  // Write the array to a CSV file
  fs.writeFileSync('urls.csv', urlsArray.join('\n'));
  console.log('Crawling complete, check urls.csv for results');
});
