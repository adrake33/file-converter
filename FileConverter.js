const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
const convert = require('xml-js');

/**
 * Reads in a CSV file of user attributes and outputs it as a JSON or XML file.
 * The output is grouped by each user's telephone area code.
 */
module.exports = class FileConverter {
  /**
   * Initializes FileConverter object.
   * 
   * @param {string} inputFile - Path to CSV file
   * @param {string} [outputFileType='json'] - Must be either 'json' or 'xml'
   * @param {string} [outputFileName] - Path to output file. Defaults to either '.output.json' or './output.xml'
   * @param {object} [searchCriteria={}] Object with keys set to field names and values set to search values
   */
  constructor(
    inputFile, 
    outputFileType='json', 
    outputFileName, 
    searchCriteria={}
  ) {
    const outputFileTypes = ['json', 'xml'];
    const searchFieldNames = ['FirstName', 'LastName', 'Gender', 'PhoneNumber', 'ID', 'EyeColor'];

    if (!inputFile) {
      throw new Error('No input file name specified');
    }

    if (!outputFileTypes.includes(outputFileType)) {
      throw new Error(`Invalid output file type: ${outputFileType}`);
    }

    for (const searchCriterion in searchCriteria) {
      if (searchCriteria.hasOwnProperty(searchCriterion) && !searchFieldNames.includes(searchCriterion)) {
        throw new Error(`Invalid field filter: ${searchCriterion}`);
      }
    }

    if (!outputFileName) {
      outputFileName = outputFileType === 'json' ? './output.json' : './output.xml';
    }

    this.inputFile = inputFile;
    this.outputFileType = outputFileType;
    this.outputFileName = outputFileName;
    this.searchCriteria = searchCriteria;
    this.inputObjs = {};
  }

  /**
   * Removes plus signs, parentheses, dots, hyphens, & spaces from phone number
   * 
   * @param {string} phoneNumber - Phone number to format
   * 
   * @return {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[\+\(\)\.\-\s]+/g, '');
  }

  /**
   * Validates if an ID is valid.
   * 
   * @param {string} id - ID to validate
   * 
   * @return {boolean} Whether the ID is valid
   */
  isValidId(id) {
    return id.match(/^[0-9]+$/);
  }

  /**
   * Validates if a name is valid.
   * 
   * @param {string} name - Name to validate
   * 
   * @return {boolean} Whether the name is valid
   */
  isValidName(name) {
    return name.match(/^[A-Za-z\.\-]+$/);
  }

  /**
   * Validates if a gender is valid.
   * 
   * @param {string} gender - Gender to validate
   * 
   * @return {boolean} Whether the gender is valid
   */
  isValidGender(gender) {
    return (gender.toLowerCase() === 'male' || gender.toLowerCase() === 'female');
  }

  /**
   * Validates if a specified phone number is valid.
   * 
   * @param {string} phoneNumber - Phone number to validate
   * 
   * @return {boolean} Whether the phone number is valid
   */
  isValidPhoneNumber(phoneNumber) {
    const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
    // Use 15 as the maximum length because some international call prefixes are 5 digits
    if (formattedPhoneNumber.length >= 10 && formattedPhoneNumber.length <= 15 && formattedPhoneNumber.match(/^[0-9]+$/)) {
      return true;
    }
    return false;
  }

  /**
   * Formats an object read from CSV file by removing spaces from object keys and '\n' from values.
   * Also outputs warnings if unexpected values are encountered.
   * 
   * @param {object} inputObject - Object containing data from CSV file row
   */
  formatAndValidateInputObject(inputObject) {
    const formattedObj = {};
    for (const key in inputObject) {
      if (inputObject.hasOwnProperty(key)) {
        // Warn for unexpected values
        if (!inputObject[key]) {
          console.warn(`${key} not set: ${JSON.stringify(inputObject)}`);
        } else {
          if (key === 'ID' && !this.isValidId(inputObject['ID'])) {
            console.warn(`Unexpected ID: ${JSON.stringify(inputObject)}`);
          }
          if (key === 'First Name' && !this.isValidName(inputObject['First Name'])) {
            console.warn(`Unexpected first name: ${JSON.stringify(inputObject)}`);
          }
          if (key === 'Last Name' && !this.isValidName(inputObject['Last Name'])) {
            console.warn(`Unexpected last name: ${JSON.stringify(inputObject)}`);
          }
          if (key === 'Gender' && !this.isValidGender(inputObject['Gender'])) {
            console.warn(`Unexpected gender: ${JSON.stringify(inputObject)}`);
          }
          if (key === 'Phone Number' && !this.isValidPhoneNumber(inputObject['Phone Number'])) {
            console.warn(`Unexpected phone number format: ${JSON.stringify(inputObject)}`);
          }
        }

        // Format object key/value
        formattedObj[key.replace(' ', '')] = inputObject[key].replace('\n', '');
      }
    }
    return formattedObj;
  }

  /**
   * Checks if an object matches all specified fields.
   * 
   * @param {object} formattedObject 
   */
  objectMatchesSearchCriteria(formattedObject) {
    let objectMatches = true;
    for (const searchField in this.searchCriteria) {
      if (
        this.searchCriteria.hasOwnProperty(searchField) &&
        formattedObject[searchField].indexOf(this.searchCriteria[searchField]) === -1
      ) {
        objectMatches = false;
      }
    }
    return objectMatches;
  }

  /**
   * Writes input objects to specified output file as JSON.
   * 
   * @returns {string} jsonString - Stringified JSON that is written to the file.
   */
  generateOutputJSON() {
    const jsonString = JSON.stringify(this.inputObjs, null, 2);
    fs.writeFileSync(this.outputFileName, jsonString);
    return jsonString;
  }

  /**
   * Writes input objects to specified output file as XML.
   * 
   * @returns {string} xmlString - XML output.
   */
  generateOutputXML() {
    const options = {compact: true, ignoreComment: true, spaces: 4};
    let xmlString = '<?xml version="1.0" encoding="utf-8"?>\n';
    xmlString += convert.json2xml(this.inputObjs, options);
    fs.writeFileSync(this.outputFileName, xmlString);
    return xmlString;
  }

  /**
   * Reads in CSV file, outputs to the specified file, and returns the output.
   * 
   * @returns {string} output - JSON/XML output that is written to the file.
   */
  generateOutput() {
    fs.createReadStream(this.inputFile)
      .pipe(csv())
      .on('data', (row) => {
        if (!_.isEmpty(row)) {
          let formattedObj = this.formatAndValidateInputObject(row);

          if (this.objectMatchesSearchCriteria(formattedObj)) {
            let areaCode = 'NoAreaCode';
            if (formattedObj.PhoneNumber && this.isValidPhoneNumber(formattedObj.PhoneNumber)) {
              const formattedPhoneNumber = this.formatPhoneNumber(formattedObj.PhoneNumber);
              // Get last 10 digits of phone number and use the first 3 digits of those as the area code
              const lastPhoneNumberDigits = formattedPhoneNumber.slice(formattedPhoneNumber.length-10, formattedPhoneNumber.length-1);
              areaCode = `AreaCode_${lastPhoneNumberDigits.slice(0, 3)}`;
            }
            if (!this.inputObjs[areaCode]) this.inputObjs[areaCode] = {};

            // Detect duplicate IDs
            if (this.inputObjs[areaCode][`User_${formattedObj.ID}`]) {
              console.warn(`Duplicate ID found: ${formattedObj.ID}. (Record will not be output.)`);
            }
            
            this.inputObjs[areaCode][`User_${formattedObj.ID}`] = formattedObj;
          }
        }
      })
      .on('end', () => {
        let result;
        switch (this.outputFileType) {
          case 'xml':
            result = this.generateOutputXML();
          case 'json':
          default:
            result = this.generateOutputJSON();
        }

        console.log(`Successfully converted ${this.inputFile} to ${this.outputFileName} as ${this.outputFileType}`);

        return result;
      });
  }
}
