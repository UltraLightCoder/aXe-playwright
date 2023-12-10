// Importing required modules and libraries
const { chromium } = require('playwright'); // Import Playwright for browser automation.
const axeCore = require('axe-core'); // Import axe-core for accessibility testing.
const fs = require('fs'); // Import Node's File System module for file operations.
const path = require('path'); // Import Node's Path module for handling file paths.
const cheerio = require('cheerio'); // Import Cheerio for parsing HTML content.
const { createHtmlReport } = require('axe-html-reporter'); // Import axe-html-reporter for creating HTML reports.

// Constants for file paths
const JSON_FILE_NAME = 'accessibility_report.json'; // Define the filename for JSON accessibility report.
const REPORT_DIR = './reports/accessibility'; // Define the directory path for saving reports.
const REPORT_FILE_NAME = 'A11yReport.html'; // Define the filename for the HTML accessibility report.
const ARCHIVE_DIR = './reports/archive'; // Define the directory path for archiving old reports.

// Function to perform an Axe accessibility scan on a given URL
async function runAccessibilityTest(url) {
    const browser = await chromium.launch(); // Launch a new browser instance.
    const page = await browser.newPage(); // Open a new page in the browser.

    try {
        // First attempt: Navigate to the URL and wait until network is idle.
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error) {
        console.log(`Initial attempt to load the page failed: ${error.message}. Trying again with 'load' event...`);
        // If the first attempt fails, navigate to the URL and wait for the load event.
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    }

    // Inject Axe-core script for accessibility testing
    await page.addScriptTag({ content: axeCore.source });

    // Run Axe-core accessibility test and store the results
    const results = await page.evaluate(() => axe.run());
    await browser.close(); // Close the browser after completing the test.

    return results; // Return the results of the accessibility test.
}


// Function to ensure a specified directory exists
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) { // Check if the directory exists.
        fs.mkdirSync(dir, { recursive: true }); // Create the directory if it doesn't exist.
    }
}

// Function to parse existing HTML report and extract data using Cheerio
function parseExistingReport(filePath) {
    const htmlContent = fs.readFileSync(filePath, 'utf8'); // Read the HTML file content.
    const $ = cheerio.load(htmlContent); // Load HTML content into Cheerio.

    // Extract scan count and total issues from the first scan
    let scanCountText = $('#scan-count').text(); // Get the text of the scan count element.
    let scanCountMatch = scanCountText.match(/\d+/); // Find the first number in the text.
    const scanCount = scanCountMatch ? parseInt(scanCountMatch[0], 10) : 1; // Parse the number as an integer.
    const totalIssuesOriginal = parseInt($('#total-issues-original').text(), 10) || null; // Parse the total issues as an integer.

    return { scanCount, totalIssuesOriginal }; // Return the extracted data.
}

// Function to generate and manage the accessibility report
async function generateReport(url) {
    try {
        const results = await runAccessibilityTest(url); // Run the accessibility test for the URL.
        const violationsTotal = results.violations.reduce((acc, violation) => acc + violation.nodes.length, 0); // Calculate total number of violations.

        // Ensure necessary directories for report and archive exist
        ensureDirectoryExists(REPORT_DIR);
        ensureDirectoryExists(ARCHIVE_DIR);

        const reportFilePath = path.join(REPORT_DIR, REPORT_FILE_NAME); // Full path for the report file.
        const previousReportExists = fs.existsSync(reportFilePath); // Check if a previous report exists.

        // Initialize variables for report data
        let scanCount;
        let totalIssuesOriginal;

        // Process existing report if it exists
        if (previousReportExists) {
            const parsedData = parseExistingReport(reportFilePath);
            scanCount = parsedData.scanCount + 1; // Increment scan count.

            // Archive the old report
            const archiveFilePath = path.join(ARCHIVE_DIR, `A11yReport-${new Date().toISOString().replace(/:/g, '-')}.html`);
            fs.renameSync(reportFilePath, archiveFilePath); // Move the old report to the archive directory.
        } else {
            scanCount = 1; // Set initial scan count.
            totalIssuesOriginal = violationsTotal; // Set initial total issues count.
        }

        // Prepare custom HTML summary content for the report
        let customSummary = `
            <div>Test Case: Full page analysis</div>
            <div id="scan-count"># of Times Scanned: ${scanCount}</div>
        `;

        // Generate HTML report with custom summary
        createHtmlReport({
            results: results,
            options: {
                projectKey: 'YourProjectName', // Project key for identification.
                customSummary: customSummary, // Custom HTML summary.
                outputDir: REPORT_DIR, // Directory for saving the report.
                reportFileName: REPORT_FILE_NAME // Filename for the report.
            }
        });

        // Delete the JSON file after generating the report
        if (fs.existsSync(JSON_FILE_NAME)) {
            fs.unlinkSync(JSON_FILE_NAME); // Remove the JSON file.
        }

    } catch (error) {
        console.error('Error during report generation:', error); // Log any errors encountered.
    }
}

// URL for the accessibility test
const url = 'https://www.nbcnews.com/'; // Replace with the desired website URL.
generateReport(url); // Execute the report generation for the specified URL.
