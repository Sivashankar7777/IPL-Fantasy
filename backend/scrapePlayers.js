import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

const teams = [
  "chennai-super-kings",
  "delhi-capitals",
  "gujarat-titans",
  "kolkata-knight-riders",
  "lucknow-super-giants",
  "mumbai-indians",
  "punjab-kings",
  "rajasthan-royals",
  "royal-challengers-bengaluru",
  "sunrisers-hyderabad"
];

async function scrapeAll() {
  const imageMap = {};

  for (const team of teams) {
    try {
      console.log(`Scraping ${team}...`);
      const { data } = await axios.get(`https://www.iplt20.com/teams/${team}`);
      const $ = cheerio.load(data);
      
      const pCount = $(".ih-p-img").length;
      console.log(`Found ${pCount} potential player cards on ${team}.`);

      $(".ih-p-img").each((i, el) => {
        let name = $(el).find(".ih-p-name h2").text().trim();
        if (!name) name = $(el).find("h2").text().trim();
        
        const imgEl = $(el).find("img");
        let imgUrl = imgEl.attr("data-src") || imgEl.attr("src");
        
        if (name && imgUrl) {
          // Normalize names
          name = name.replace(/\s+/g, ' ');
          
          if (!imageMap[name]) {
            imageMap[name] = imgUrl;
          }
        }
      });
    } catch (err) {
      console.error(`Error scraping ${team}: ${err.message}`);
    }
  }

  console.log(`Scraped ${Object.keys(imageMap).length} players total.`);
  
  // Write to a local database file
  fs.writeFileSync('./playerImageMap.json', JSON.stringify(imageMap, null, 2));
  console.log("Saved to playerImageMap.json! The backend will now use this.");
}

scrapeAll();
