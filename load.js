const { IotaAnchoringChannel, SeedHelper } = require("@tangle-js/anchors");
const { exit } = require("process");
const os = require('os');

const node = "https://chrysalis-nodes.iota.org";

// Main function
async function loadData(params) {
    const records = etlLoadDataYear(params.file);

    console.log("CSV data loaded");

    const channelPlant = await IotaAnchoringChannel.fromID(
        params.plantChannelID, { node, encrypted: true } ).bind(params.plantChannelSeed); 

    console.log("Creating a channel for year", params.yearNumber);
    // Here we have just created a new channel for the year and recorded it on the overall plant channel
    const { channelDetails, nextPlantAnchorageID } = await createChannelForYear(
        channelPlant, params.plantChannelNextAnchorage, params.yearNumber
    );
    console.log("Created!");

    // Now we bind to the new channel for the year and write the data
    const channelForYear = await IotaAnchoringChannel.fromID(
        channelDetails.channelID, { node, encrypted: true }).bind(channelDetails.authorSeed);

    console.log("Writing data to Tangle ....");

    await writeOneYearData(records, channelForYear);

    console.log("Data Written to Tangle");

    console.log(`Index Channel for plant: ${params.plantID}: ${channelPlant.channelID}`);
    console.log(`Seed of the index channel for plant: ${params.plantID}: ${channelPlant.seed}`);
    console.log(`Next anchorageID for plant: ${params.plantID}: ${nextPlantAnchorageID}`);
    console.log(`Pub Key of the index channel for plant: ${params.plantID}: ${channelPlant.authorPubKey}`);

    console.log(`Data Channel for plant ${params.plantID} and  year ${params.yearNumber}: ${channelDetails.channelID}. `);
    console.log(`Seed of the data channel for plant ${params.plantID} and year: ${params.yearNumber}: ${channelDetails.authorSeed}`);
    console.log(`Pub Key of the data channel for plant ${params.plantID} and year: ${params.yearNumber}: ${channelDetails.authorPubKey}`);

}

// Loads data from CSV for a plant and a year
function etlLoadDataYear(file) {
    const data = require("fs").readFileSync(file, "utf8")
    const records = data.split(os.EOL);

    // Skip the header
    return records.slice(1);
}

// Writes one year of data on the Channel specific for the plant and the year
async function writeOneYearData(records, channelForYear) {
    let nextAnchorage = channelForYear.firstAnchorageID;

    console.log(records);

    for (const record of records) {
        if (record && record.trim()) {
            console.log("Anchoring record ...");
            const payload = {
                record: record.toString(),
                timestamp: new Date().toISOString()
            };
            const result = await channelForYear.anchor(Buffer.from(JSON.stringify(payload)), nextAnchorage);
            console.log("Record anchored at ",result.msgID);

            nextAnchorage = result.msgID;
        }
    }
}

// Creates a new channel to store the plant data for a year
async function createChannelForYear(channelPlant, nextAnchorage, yearNumber) {
    // New channel for the year
    const channelDetails = await IotaAnchoringChannel.create(
        SeedHelper.generateSeed(81), { node, encrypted: true }
    );

    const message = {
        year: yearNumber,
        channelID: channelDetails.channelID,
        authorPubKey: channelDetails.authorPubKey,
        timestamp: new Date().toISOString()
    };

    // Now it is added to the channel plant
    const result = await channelPlant.anchor(Buffer.from(JSON.stringify(message)), nextAnchorage);

    // The channel for the year is created
    return { channelDetails, nextPlantAnchorageID: result.msgID };
}

// Only called first time the plant data is being tracked (1 time per plant)
async function createChannelForPlant(plantID) {
    const channel = await IotaAnchoringChannel.bindNew({ node, encrypted: true });
    
    const payload = {
        plantID,
        timestamp: new Date().toISOString()
    };

    const result = await channel.anchor(Buffer.from(JSON.stringify(payload)), channel.firstAnchorageID);

    return { channelID: channel.channelID, nextAnchorageID: result.msgID, seed: channel.seed };
}

async function main() {
    // File to process
    file = process.argv[2];
    // Concerned plant
    const plantID = process.argv[3];
    // Concerned year
    const yearNumber = process.argv[4];

    if (!file || !plantID || !yearNumber) {
        console.error("Please provide file, plantID and yearNumber");
        exit(-1);
    }

    // The indexing channel associated to the plant
    let plantChannelID = process.argv[5];

    // The seed used for the plant indexing channel
    let plantChannelSeed = process.argv[6];

    // The next anchorage for next year in in the indexing channel
    let plantChannelNextAnchorage = process.argv[7];

    // If there is no existing channel for the plant a new one is created
    if (!plantChannelID) {
        console.log("Creating a new channel for plant", plantID, "...");
        const channelDetails = await createChannelForPlant(plantID);
        console.log("Created!");
        plantChannelID = channelDetails.channelID;
        plantChannelSeed = channelDetails.seed;
        plantChannelNextAnchorage = channelDetails.nextAnchorageID;
    }
    
    await loadData({
        file,
        plantID,
        yearNumber,
        plantChannelID,
        plantChannelSeed,
        plantChannelNextAnchorage
    });
}

main().then(() => console.log("Done!")).catch(err => console.error(err));
