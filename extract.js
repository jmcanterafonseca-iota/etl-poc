const { IotaAnchoringChannel, SeedHelper } = require("@tangle-js/anchors");
const { exit } = require("process");

const node = "https://chrysalis-nodes.iota.org";

// Main function
async function extractData(params) {
    // The indexing channel
    const channelPlant = await IotaAnchoringChannel.fromID(
        params.plantChannelID, { node, encrypted: true } ).bind(SeedHelper.generateSeed(20));

    const result = await channelPlant.fetchNext();

    if (!result) {
        console.error("Channel empty");
        exit(-1);
    }
    const payload = JSON.parse(result.message.toString());
    if (payload.plantID !== params.plantID) {
        console.error("The channel does not match the plant");
        exit(-1);
    } 

    // We read until reaching the proper year
    let found = false;
    let channelID = "";
    while (!found) {
        const result = await channelPlant.fetchNext(); 
        if (!result) {
            break;
        }

        const index = JSON.parse(result.message.toString());
        if (index.year === params.yearNumber) {
            found = true;
            channelID = index.channelID;
        }
    }

    if (!found) {
        console.error("Year not found", params.yearNumber);
        exit(-1);
    }

    // Now we iterate over the data channel
    const dataChannel = await IotaAnchoringChannel.
            fromID(channelID, { node, encrypted: true }).bind(SeedHelper.generateSeed(20));

    let finish = false;
    while (!finish)  {
        const record = await dataChannel.fetchNext();
        if (!record) {
            finish = true;
        }
        else {
            console.log(record.message.toString());
        }
    }
}

async function main() {
    // Concerned plant
    const plantID = process.argv[2];
    // Concerned year
    const yearNumber = process.argv[3];

     // The indexing channel associated to the plant
    const plantChannelID = process.argv[4];

    if (!plantID || !yearNumber || !plantChannelID) {
        console.error("Please provide plantID, yearNumber and plant Channel ID");
        exit(-1);
    }
    
    await extractData({
        plantID,
        yearNumber,
        plantChannelID
    });
}

main().then(() => console.log("Done!")).catch(err => console.error(err));
