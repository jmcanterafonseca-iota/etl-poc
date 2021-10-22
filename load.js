const { IotaAnchoringChannel, SeedHelper, ProtocolHelper } = require("@tangle-js/anchors");
const { exit } = require("process");
const os = require('os');

const node = "https://chrysalis-nodes.iota.org";
const permanode = "https://chrysalis-chronicle.iota.org/api/mainnet/";

const channelConfig = { node, permanode, isPrivate: true, encrypted: true };

/** 
 * Generates a preshared key to be used to later extract data from a channel. 
 * 
 * Please use here any password generator and a length that suits you well
 */
function generatePsk() {
    return SeedHelper.generateSeed(12);
}

// Main function
async function loadData(params) {
    const records = etlLoadDataYear(params.file);

    console.log("CSV data loaded");

    // The indexing channel for the plant
    const channelPlant = await IotaAnchoringChannel.fromID(
        params.plantChannelID, channelConfig).bind(params.plantChannelSeed); 

    console.log("Creating a channel for year", params.yearNumber, "...");
    // Here we have just created a new channel for the year and recorded it on the overall plant channel
    const { channelDetails, nextPlantAnchorageID, psk } = await createChannelForYear(
        channelPlant, params.plantChannelNextAnchorage, params.yearNumber, params.plantChannelPsk
    );
    console.log("Created!");

    // Now we bind to the new channel for the year and write the data
    const channelForYear = await IotaAnchoringChannel.fromID(
        channelDetails.channelID, channelConfig).bind(channelDetails.authorSeed);

    console.log("Writing data to Tangle ....");

    await writeOneYearData(records, channelForYear);

    console.log("Data Written to Tangle!");

    console.log(`Index Channel for plant: ${params.plantID}: ${channelPlant.channelID}`);
    console.log(`Seed of the index channel for plant: ${params.plantID}: ${channelPlant.seed}`);
    console.log(`Pre-shared key of the index channel for plant: ${params.plantID}: ${params.plantChannelPsk}`);
    console.log(`Next anchorageID for plant: ${params.plantID}: ${nextPlantAnchorageID}`);
    console.log(`Pub Key of the index channel for plant: ${params.plantID}: ${channelPlant.authorPubKey}`);

    console.log(`Data Channel for plant ${params.plantID} and  year ${params.yearNumber}: ${channelDetails.channelID}. `);
    console.log(`Seed of the data channel for plant ${params.plantID} and year: ${params.yearNumber}: ${channelDetails.authorSeed}`);
    console.log(`Pre-shared key of the data channel for plant ${params.plantID} and year: ${params.yearNumber}: ${psk}`);
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
            
            const msgIDL1 = await ProtocolHelper.getMsgIdL1(channelForYear, result.msgID);
            console.log("Record anchored at ", result.msgID, "Tangle MsgID:", msgIDL1);

            nextAnchorage = result.msgID;
        }
    }
}

// Creates a new channel to store the plant data for a year
// The same psk as for the channel is re-used. 
// If desired a different PSK could be generated
async function createChannelForYear(channelPlant, nextAnchorage, yearNumber, pskParam) {
    let psk = pskParam;
    if (!psk) {
        psk = generatePsk();
    }

    const params = { ...channelConfig, presharedKeys: [psk] };

    // New channel for the year
    const channelDetails = await IotaAnchoringChannel.create(
        SeedHelper.generateSeed(81), params
    );

    const message = {
        year: yearNumber,
        channelID: channelDetails.channelID,
        authorPubKey: channelDetails.authorPubKey,
        timestamp: new Date().toISOString()
    };

    // Now it is added to the channel plant (to the index)
    const result = await channelPlant.anchor(Buffer.from(JSON.stringify(message)), nextAnchorage);

    // The channel details are returned and also the next anchorageID (on the indexing channel) for upcoming years
    return { channelDetails, nextPlantAnchorageID: result.msgID, psk };
}

// Only called first time the plant data is being tracked (1 time per plant)
// Creates the indexing channel for the plant
async function createChannelForPlant(plantID) {
    // Preshared key needed for extraction
    const psk = generatePsk();

    const params = { ...channelConfig, presharedKeys: [ psk ] };
    const channel = await IotaAnchoringChannel.bindNew(params);
    
    const payload = {
        plantID,
        timestamp: new Date().toISOString()
    };

    const result = await channel.anchor(Buffer.from(JSON.stringify(payload)), channel.firstAnchorageID);

    return { channelID: channel.channelID, nextAnchorageID: result.msgID, 
        seed: channel.seed, psk, authorPubKey: channel.authorPubKey 
    };
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

    // The pre-shared key to use for the year channel
    let plantChannelPsk = process.argv[8];

    // If there is no existing channel for the plant a new one is created
    if (!plantChannelID) {
        console.log("Creating a new channel for plant", plantID, "...");
        const channelDetails = await createChannelForPlant(plantID);
        console.log("Created!");
        plantChannelID = channelDetails.channelID;
        plantChannelSeed = channelDetails.seed;
        plantChannelPsk = channelDetails.psk;
        plantChannelNextAnchorage = channelDetails.nextAnchorageID;
    }
    
    await loadData({
        file,
        plantID,
        yearNumber,
        plantChannelID,
        plantChannelSeed,
        plantChannelPsk,
        plantChannelNextAnchorage
    });
}

main().then(() => console.log("Done!")).catch(err => console.error(err));
