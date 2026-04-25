/**
 * scrape_vit.js
 * --------------
 * Fetches live data from VIT official website and updates data.json.
 * Run: node scripts/scrape_vit.js
 * 
 * This script scrapes:
 *   - Placement stats from https://www.vit.edu/placement/
 *   - Latest announcements from https://www.vit.edu/announcements/
 *   - Exam notifications from https://www.vit.edu/examinations/
 *   - Academic calendar from https://www.vit.edu/academics-calendar/
 * 
 * Author: Tanmay
 */

const { parse } = require('node-html-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATA_FILE = path.join(__dirname, '../lib/data.json');

// ── Simple HTTP fetch (no external deps needed for scraping) ──
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VITChatbotBot/1.0; +https://github.com/tanmay/vit-chatbot)'
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

async function scrapeAnnouncements() {
  console.log('📢 Scraping announcements...');
  try {
    const html = await fetchPage('https://www.vit.edu/announcements/');
    const root = parse(html);
    
    const items = [];
    // Try common announcement list selectors
    const links = root.querySelectorAll('a[href*="vit.edu"]');
    for (const link of links.slice(0, 15)) {
      const text = link.text?.trim();
      if (text && text.length > 20 && text.length < 200) {
        const href = link.getAttribute('href') || '';
        if (!href.includes('#') && !href.includes('javascript')) {
          items.push({ title: text, url: href });
        }
      }
    }
    console.log(`  ✓ Found ${items.length} announcements`);
    return items.slice(0, 8);
  } catch (e) {
    console.warn('  ⚠ Could not scrape announcements:', e.message);
    return [];
  }
}

async function scrapePlacements() {
  console.log('🚀 Scraping placement data...');
  try {
    const html = await fetchPage('https://www.vit.edu/placement/');
    const root = parse(html);
    const bodyText = root.querySelector('body')?.text || '';
    
    // Extract key stats using regex on page text
    const highest = bodyText.match(/(\d+)\s*LPA\s*(?:Highest|highest)/)?.[1];
    const median  = bodyText.match(/(\d+\.?\d*)\s*LPA\s*(?:Median|median|Average|average)/)?.[1];
    const percent = bodyText.match(/(\d+\.?\d*)\s*%\s*(?:Placement|placement)/)?.[1];
    
    const result = {};
    if (highest) result.highest_package = `₹${highest} LPA`;
    if (median)  result.median_salary = `₹${median} LPA`;
    if (percent) result.placement_percentage = `${percent}%`;
    
    console.log('  ✓ Placement stats:', result);
    return result;
  } catch (e) {
    console.warn('  ⚠ Could not scrape placements:', e.message);
    return null;
  }
}

async function scrapeExams() {
  console.log('📅 Scraping exam info...');
  try {
    const html = await fetchPage('https://www.vit.edu/examinations/');
    const root = parse(html);
    
    const links = [];
    root.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.text?.trim();
      if (href.endsWith('.pdf') && text && text.length > 5) {
        links.push({ title: text, url: href });
      }
    });
    
    console.log(`  ✓ Found ${links.length} exam documents`);
    return links.slice(0, 10);
  } catch (e) {
    console.warn('  ⚠ Could not scrape exams:', e.message);
    return [];
  }
}

async function scrapeCalendar() {
  console.log('📆 Scraping academic calendar...');
  try {
    const html = await fetchPage('https://www.vit.edu/academics-calendar/');
    const root = parse(html);
    
    const links = [];
    root.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.text?.trim();
      if ((href.includes('.pdf') || href.includes('calendar')) && text) {
        links.push({ title: text, url: href });
      }
    });
    
    console.log(`  ✓ Found ${links.length} calendar links`);
    return links.slice(0, 5);
  } catch (e) {
    console.warn('  ⚠ Could not scrape calendar:', e.message);
    return [];
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  VIT Chatbot — Live Data Scraper     ║');
  console.log('║  Author: Tanmay                      ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Load existing data
  const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // Scrape live data
  const [announcements, placements, examLinks, calendarLinks] = await Promise.all([
    scrapeAnnouncements(),
    scrapePlacements(),
    scrapeExams(),
    scrapeCalendar()
  ]);

  // Merge into existing data
  existing._meta.last_updated = new Date().toISOString().split('T')[0];
  existing._meta.last_scraped = new Date().toISOString();

  if (announcements.length) {
    existing.live_announcements = announcements;
  }

  if (placements && Object.keys(placements).length) {
    existing.placements.ay_2024_25 = {
      ...existing.placements.ay_2024_25,
      ...placements
    };
  }

  if (examLinks.length) {
    existing.examinations.documents = examLinks;
  }

  if (calendarLinks.length) {
    existing.examinations.calendar_links = calendarLinks;
  }

  // Save updated data
  fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2));
  console.log('\n✅ data.json updated with live VIT data!');
  console.log(`📂 Saved to: ${DATA_FILE}`);
}

main().catch(console.error);
