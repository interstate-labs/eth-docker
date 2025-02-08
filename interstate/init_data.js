const fs = require('fs');
const path = require('path');

const baseDir = './assigned_data/keys';

const run = async () => {
  let credentialsObj = {};
  let credentials = [];
  let indices = [];

  try {
    // Get all directories inside the baseDir
    const pubkeys = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory()) // Only get directories
      .map(dirent => dirent.name); // Extract directory names

    for (let i = 0; i < pubkeys.length; i++) {
      const pubkey = pubkeys[i];
      try {
        const response = await fetch(
          `https://ethereum-holesky-beacon-api.publicnode.com/eth/v1/beacon/states/finalized/validators/${pubkey}`
        );
        const validatorInfo = await response.json();

        if (validatorInfo.data) {
          const index = Number(validatorInfo.data.index); // Convert index to number
          credentialsObj[index] = validatorInfo.data.validator.withdrawal_credentials;
          indices.push(index);
        } else {
          console.warn(`No data found for pubkey: ${pubkey}`);
        }
      } catch (fetchError) {
        console.error(`Error fetching data for pubkey ${pubkey}:`, fetchError);
      }
    }
  } catch (error) {
    console.error("Error reading pubkeys:", error);
  }

  // Convert indices to numbers (if not already) and sort numerically
  indices = indices.sort((a, b) => a - b);

  // Order credentials based on sorted indices
  for (let i = 0; i < indices.length; i++) {
    credentials.push(credentialsObj[indices[i]]);
  }

  console.log("Indices:", indices);

  try {
    const envFilePath = path.join(__dirname, 'secrets.env');
    let envContent = fs.readFileSync(envFilePath, 'utf8');

    envContent = envContent.replace(
      /VALIDATOR_INDICES=".*?"/,
      `VALIDATOR_INDICES="${indices.join(', ')}"`
    );

    envContent = envContent.replace(
      /WITHDRAWALS_CREDENTIALS=".*?"/,
      `WITHDRAWALS_CREDENTIALS="${credentials.join(', ')}"`
    );

    fs.writeFileSync(envFilePath, envContent, 'utf8');

    console.log("Updated secrets.env successfully!");
  } catch (error) {
    console.error("Error updating secrets.env:", error);
  }
};

run();
