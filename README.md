# etl-poc

Please read https://github.com/iotaledger/tangle.js/tree/main/libs/anchors so that you get familiar with IOTA Streams and the Anchors library. 

## How to run

Before running any of the scripts, please execute 

```
npm install
``` 

## Load plant data from one year

Load the data from plant `12` on year `2020`. There is no an existing index channel for plant `12` so a new one will be automatically created. Both the plant index channel and the channel that holds yearly data are assigned the same pre-shared key that allows later data extraction. 

```sh
node load.js plant12-year2.csv 12 2020
```

```
Index Channel for plant: 12: 657c84fcedd7cd9e23c2a86976ba15c85c636147929ab9193b6cd6f7e74ddbd50000000000000000:b717af36151e0a65ec78fcae:df5e1954114f270074425bc8
Seed of the index channel for plant: 12: iqurcgwmabuhbjauxjadtxgbcjfhxnpbtmnlvhvmtlczgmajikaiyvmhckgtshhjqrplsfkjsfqfwdps
Pre-shared key of the index channel for plant: plant12: skicsymsxo
Next anchorageID for plant: 12: c86733a7c16a70c8a5685449
Pub Key of the index channel for plant: 12: 657c84fcedd7cd9e23c2a86976ba15c85c636147929ab9193b6cd6f7e74ddbd5
Data Channel for plant 12 and  year 2020: 61b96d80b9ea6bfd67ce03483c82c29775b1cc85d790e1ffd5a525ccec38f22e0000000000000000:b58f6971255975de51fc10e4:f6cad03660df1f6366a0b451.
Seed of the data channel for plant 12 and year: 2020: gngbqlqlxljblpurwoyrszehiawfaloxuzfoodmtemuchofnjqfgyhqcrgdfyjabgqcfvotdzqcovtttz
Pre-shared key of the data channel for plant plant12 and year: 2021: skicsymsxo
Pub Key of the data channel for plant 12 and year: 2020: 61b96d80b9ea6bfd67ce03483c82c29775b1cc85d790e1ffd5a525ccec38f22e
```

## Extract plant data from one year

Extract the data from plant `12` on year `2020`

```sh
node extract.js 12 2020 657c84fcedd7cd9e23c2a86976ba15c85c636147929ab9193b6cd6f7e74ddbd50000000000000000:b717af36151e0a65ec78fcae:df5e1954114f270074425bc8 skicsymsxo
```

You can observe we are passing the plant ID, the year, the index channel ID for our plant and the pre-shared key. 

## Load plant data from one year (plant index channel already exists)

Load the data from plant `12` on year `2021`

```sh
node load.js plant12-year1.csv 12 2021 657c84fcedd7cd9e23c2a86976ba15c85c636147929ab9193b6cd6f7e74ddbd50000000000000000:b717af36151e0a65ec78fcae:df5e1954114f270074425bc8 iqurcgwmabuhbjauxjadtxgbcjfhxnpbtmnlvhvmtlczgmajikaiyvmhckgtshhjqrplsfkjsfqfwdps c86733a7c16a70c8a5685449 skicsymsxo
```

You can observe that now we are passing the index channel ID for our plant, the seed, the next anchorage ID and the pre-shared key. The latter is optional and, if not defined, a new pre-shared key will be created for the corresponding year. 
