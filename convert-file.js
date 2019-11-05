// This script uses the FileConverter class to read in a specified CSV file of user attributes and output it as a JSON or XML file.
// The output is grouped by each user's telephone area code.

// Flags: - inputFile (required): name of the CSV file to read
//        - ouputType (optional): can be 'json' (default) or 'xml'
//        - outputFile (optional): output file path that defaults to ./ouptput.json
//        - FirstName, LastName, Gender, PhoneNumber, ID, or EyeColor (optional): search criteria used to only output certain users. 
//          Multiple filters may be used.

// Example usage in terminal:
// > node FileConverter.js inputFile=input.csv outputType=json outputFile=myOutputFile.json LastName=Stanford

const FileConverter = require('./FileConverter');

try {
  const inputParams = process.argv.slice(2);

  let inputFile = null;
  let outputFileType = 'json';
  let outputFileName = null;
  let searchCriteria = {};

  for (const element of inputParams) {
    const param = element.split('=');

    if (param[0] === 'inputFile') {
      inputFile = param[1];
    } else if (param[0] === 'outputType') {
      outputFileType = param[1];
    } else if (param[0] === 'outputFile') {
      outputFileName = param[1];
    } else if (param.length === 2) {
      if (!searchCriteria[param[0]]) {
        searchCriteria[param[0]] = [];
      }
      searchCriteria[param[0]].push(param[1]);
    } else {
      throw new Error('Unknown input parameter:', param[0]);
    }
  }

  if (!outputFileName) {
    outputFileName = outputFileType === 'json' ? './output.json' : './output.xml';
  }

  const fileConverter = new FileConverter(inputFile, outputFileType, outputFileName, searchCriteria);
  fileConverter.generateOutput();
} catch (err) {
  console.error(err);
}