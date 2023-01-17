/**  Copyright (c) 2022 Mastercard
 
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
 
    http://www.apache.org/licenses/LICENSE-2.0
 
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

window.zappCreditorCommerceApi = window.zappCreditorCommerceApi || {};

zappCreditorCommerceApi.dspDetail = {};	
dspMetaDataList = {};

zappCreditorCommerceApi.zappCreditorCommerceJourneyTypes = {
	requestToPay: "rx",
    requestToLink: "ry"
};
const universalLinkKeys = {
    lifeCycleId: "lc",
    businessType: "tb",
    journeyType: "uc"
};
const parsedManifestSignedData = [];
const manifestDataSeparator = '.';		//Manifest signed data separator.
const manifestDataArraySize = 3;		//Signed Manifest data array length
const headerIndexInManifestData = 0; 	//Signed Header Index in Manifest data ie. 0
const payloadIndexInManifestData = 1;	//Signed Payload Index in Manifest data ie. 1
const signatureIndexInManifestData = 2;	//Signed Signature Index in Manifest data ie. 2

/**
 * Get Dsp Details from DSP manifest file
 * @param  {String} dspManifestUrl which is the DSP's manifest file hosted on cdn location
 * @return {Boolean} isVerificationRequired -  validation is mandatory or not from merchant  
 * @return {Boolean} Generate zappCreditorCommerceApi objects with the DSP's bank details 
 */
zappCreditorCommerceApi.getDspDetails = (dspManifestUrl,isVerificationRequired = false) => new Promise(
    function (resolve, reject) {
    	try {
			if(dspManifestUrl == ""){   //checked if dspManifestUrl is Empty or not
				throw (new Error("1005"));
			}
			if(dspManifestUrl.search("https://") != 0) { // check if dspManifestUrl is start with Secure protocol https or not 
				throw (new Error("1006"));
			} else {
				fetch(dspManifestUrl)
				.then(function(response) {
					if (response.status !== 200) {
						postError("MC1001" , "Technical error occurred. "+ response.status);
						return;
					}
					return response.text();
				})
				.then(function(manifestResponse) {
					let decodedRes = "";
					if (manifestResponse ==="" || manifestResponse.trim() ===""){  //check Dsp List file empty or not
						throw (new Error("1007"));
					}
					if(!getPayloadWithSignatureData(manifestResponse,isVerificationRequired)){   //Validate and Parse Manifest signed data;
						throw (new Error("1007"));
					} else {
						decodedRes = getPayloadWithSignatureData(manifestResponse,isVerificationRequired); //Parse and get Payload section seperatly;
					}
					if(!decodedRes || !decodedRes.apps || !decodedRes.apps.length){  
					// check DspList is empty or not.
						throw (new Error("1007"));
					} else {  
						zappCreditorCommerceApi.dspCount = decodedRes.apps.length;
						for(var i=0 ; i<zappCreditorCommerceApi.dspCount; i++){
							if(decodedRes.apps[i].dspName == undefined || decodedRes.apps[i].dspName == null || decodedRes.apps[i].dspName == ""){   
							//check if dspName is blank or not
								throw (new Error("1007"));
							}
							if(decodedRes.apps[i].dspApiVersion == undefined || decodedRes.apps[i].dspApiVersion == null || decodedRes.apps[i].dspApiVersion == ""){   
							//check if dspApiVersion is blank or not
								throw (new Error("1007"));
							} 
							if(decodedRes.apps[i].dspLogo == undefined || decodedRes.apps[i].dspLogo == null || decodedRes.apps[i].dspLogo == ""){   
							//check if dspLogo path is blank or not
								throw (new Error("1007"));
							}
							if(decodedRes.apps[i].dspUniversalLink == undefined || decodedRes.apps[i].dspUniversalLink == null || decodedRes.apps[i].dspUniversalLink == ""){   
							//check if dspUniversalLink is blank or not
								throw (new Error("1007"));
							}
							if(decodedRes.apps[i].dspUniqueId == undefined || decodedRes.apps[i].dspUniqueId == null || decodedRes.apps[i].dspUniqueId == ""){   
							//check if dspUniqueId is blank or not
								throw (new Error("1007"));
							}
							if(decodedRes.apps[i].appIconHash == undefined || decodedRes.apps[i].appIconHash == null || decodedRes.apps[i].appIconHash == ""){   
							//check if appIconHash string is empty or not
								throw (new Error("1007"));
							}else{
								dspJsonObj = {};
								dspJsonObj.dspUniqueId = decodedRes.apps[i].dspUniqueId;
								dspJsonObj.dspName = decodedRes.apps[i].dspName;
								dspJsonObj.dspLogo = decodedRes.apps[i].dspLogo;
								dspJsonObj.dspApiVersion = decodedRes.apps[i].dspApiVersion;
								dspJsonObj.dspAppIconHash = decodedRes.apps[i].appIconHash;
								zappCreditorCommerceApi.dspDetail[i] = dspJsonObj;
								// zappCreditorCommerceApi meta object having all DSP"s data
								dspMetaDataList[decodedRes.apps[i].dspUniqueId] = decodedRes.apps[i];
							}
						}
						resolve(true);
					}
				})
				.catch(function(err) {
					errorHandler(err.message);
				});
			}
    	}
    	catch(e){
    		errorHandler(e.message);
    	}
    }
);


/**
 * To validate and parse signed manifest data
 * @param  {String} manifestSignedData encoded manifest list data
 * @param  {Boolean} isVerificationRequiredFlag - validation is mandatory or not from merchant
 * @return {String} Return the payload section from manifest signed data
 */
function getPayloadWithSignatureData(manifestSignedData,isVerificationRequiredFlag) {
	try {
		const manifestParsedData = manifestSignedData.split(manifestDataSeparator);
		if(manifestParsedData.length != manifestDataArraySize)	return false;  //Check manifest file data with header,payload and signature
		if(manifestParsedData[headerIndexInManifestData] == '' || manifestParsedData[payloadIndexInManifestData] == '' || manifestParsedData[signatureIndexInManifestData] == '') return false;  //check empty header,payload and signature data
		
		parsedManifestSignedData.headerData = JSON.parse(decodeBase64ToString( manifestParsedData[headerIndexInManifestData]));
		parsedManifestSignedData.payloadData = JSON.parse(decodeBase64ToString(manifestParsedData[payloadIndexInManifestData]));
		parsedManifestSignedData.signatureData = manifestParsedData[signatureIndexInManifestData];
		
		if(isVerificationRequiredFlag){	
			//TODO: validate signature here As of now skip signature verification as it is not implemented
			return parsedManifestSignedData.payloadData;
		}else{
			//If validation is not mandatory from merchant
			return parsedManifestSignedData.payloadData; 	
		}		
	} catch (err) {
		return false;
	}
}


/**
 * To invoke the mobile banking app
 * @param  {String} dspId is the unique id of bank 
 * @param  {String} lifeCycleId will either paymentRequestLifeCycleId or agreementLifeCycleId from submit API call
 * @param  {Number} businessType As per business case this paramter required.
 * @param  {String} journeyType to capture which journey user selected
 * @return {String} Generate the universal link and the bank app gets invoked
 */
zappCreditorCommerceApi.invokeApp = function(dspId, lifeCycleId, businessType, journeyType){
	var universalLinkUrl = null;
	if(validateRequestParam(dspId, lifeCycleId, businessType, journeyType)) {
		universalLinkUrl = dspMetaDataList[dspId].dspUniversalLink+"?"+universalLinkKeys.lifeCycleId+"="+encodeStringToBase64(lifeCycleId)+"&"+universalLinkKeys.businessType+"="+encodeStringToBase64(businessType)+"&"+universalLinkKeys.journeyType+"="+encodeStringToBase64(journeyType);
		window.open(universalLinkUrl, "_blank");
	}
};

/**
 * Custom function to return parameterized universal link from library
 * @param  {String} dspId is the unique id of bank 
 * @param  {String} lifeCycleId will either paymentRequestLifeCycleId or agreementLifeCycleId from submit API call
 * @param  {Number} businessType As per business case this paramter required.
 * @param  {String} journeyType to capture which journey user selected
 * @return {string}  Generate parameterisedLink 
 */
zappCreditorCommerceApi.getUniversalLink = function(dspId, lifeCycleId, businessType, journeyType) {
	var parameterisedLink = null;
	if(validateRequestParam(dspId, lifeCycleId, businessType, journeyType)) {
		parameterisedLink = dspMetaDataList[dspId].dspUniversalLink+"?"+universalLinkKeys.lifeCycleId+"="+encodeStringToBase64(lifeCycleId)+"&"+universalLinkKeys.businessType+"="+encodeStringToBase64(businessType)+"&"+universalLinkKeys.journeyType+"="+encodeStringToBase64(journeyType);
		return parameterisedLink;
	}
};

/**
 * Encode String to Base64
 * @param dataString: String the need to encode to base64
 * @return String : Base 64 encoded string
 **/
function encodeStringToBase64(dataString) {
    return btoa(dataString);
}

/**
 * Decode Base64 to String
 * @param dataString: String the need to String
 * @return String : decoded string
 **/
function decodeBase64ToString(dataString) {
    return atob(dataString);
}

/**
 * This is internal common library function to validate all the parameters from cdn file and invoke function call
 * @param  {Number} dspId is the unique id of bank 
 * @param  {String} lifeCycleId will either paymentRequestLifeCycleId or agreementLifeCycleId from submit API call
 * @param  {Number} businessType As per business case this paramter required.
 * @param  {String} journeyType to capture which journey user selected
 * @return {Throw error} Checks for the error and throw error code so that respective error message gets returned
 */
 function validateRequestParam(dspId, lifeCycleId, businessType, journeyType) {
	try{
		if(dspId === null || dspId.length === 0 || typeof(dspId) === "undefined" || typeof(dspMetaDataList[dspId]) === "undefined"){
			throw (new Error("1001"));
		}
		if(typeof(lifeCycleId) === "undefined" || lifeCycleId === null || lifeCycleId.length === 0){	
			throw (new Error("1002"));
		}		
		if(businessType === null || businessType.length === 0 || typeof(businessType) === "undefined"){
			throw (new Error("1003"));
		}
		if(journeyType !== zappCreditorCommerceApi.zappCreditorCommerceJourneyTypes.requestToPay
		 && journeyType !== zappCreditorCommerceApi.zappCreditorCommerceJourneyTypes.requestToLink){
			throw (new Error("1004"));
		}else {
			return true;
		}
	}
	catch(e){
		errorHandler(e.message);	
	}
}

/**
 * To handle the errors 
 * @param  {String} errorCode The error code which is defined for specific error type
 */
function errorHandler(errorParam) {
	Object.keys(errorCodeObject).forEach(errorCode => {
		if(errorCode === errorParam) {
			postError(errorParam, errorCodeObject[errorCode]);
		}
	});
}

/**
 * To post given error code and message 
 * @param  {String} eId The error code
 * @param  {String} eDesc The error Description
 * @return {Object}  It generate event and send it merchant with error data object which include error code, description.   
 */
function postError(eId, eDesc) {
	var timeStamp = new Date();
	var errorData = {
		errorCode: eId,
		errorMessage: eDesc
	};
	postData = {
		eventType : "zappCreditorCommerceApiError",
		data : errorData
	};
	const targetOrigin = window.location.protocol + "//" + window.location.hostname;
	window.parent.postMessage(postData, targetOrigin);
}

/**
 * Common object of error codes and messages with key is errorcode and value is error message format
 */
const errorCodeObject = Object.freeze({
	"1001": "DSP Id is invalid.",
	"1002": "Lifecycle id is invalid.",
	"1003": "Business type is invalid.",
	"1004": "Journey type is invalid.",
	"1005": "Unable to reach to configured URL. Please check and reconfigure dsp manifest file URL.",
	"1006": "Invalid protocol, secure protocol HTTPS is only supported.",
	"1007": "Invalid dsp manifest file. Please recheck and configure again."
});
