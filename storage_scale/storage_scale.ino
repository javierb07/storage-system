// Import necessary libraries
#include <Wire.h>   // I2C protocol library
#include <EEPROM.h> // Needed to record user settings
#include <SparkFun_Qwiic_Scale_NAU7802_Arduino_Library.h>   // Qwiic scale library by SparkFun
#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>

NAU7802 myScale; // Create instance of the NAU7802 class

bool settingsDetected = false; // Used to prompt user to calibrate their scale

// Create an array to take average of weights. This helps smooth out jitter
#define AVG_SIZE 10
float avgWeights[AVG_SIZE];
byte avgWeightSpot = 0;

float partWeight = 6;
int numberParts = 0;
String scaleID = "1";
bool partChanged = false;
int lastPartNumber = 0;
String partID = "Screw_1_4-20x1_inch";
String newPartID = "";

char* ssid = "CDI";
char* password = "CDIPurdue2016";
int PORT = 80;
IPAddress server(10,0,1,129);  
//char* server = "51b5b03f95c044f878f8ddeae47fbf4b.balena-devices.com";
WiFiClient client;  // Initialize the client library

void setup()
{
    Serial.begin(9600); // Open serial port at 9600 baud
    delay(100);
    Serial.println("Intelligent Storage System");

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print("Connecting to WiFi..");
    }
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
    // Make a HTTP POST request to set up the part:
    partSetupRequest(partID, scaleID);

    Wire.begin(); // Initiate the Wire library and join the I2C bus as a master or slave
    Wire.setClock(400000); // Qwiic Scale is capable of running at 400kHz if desired
    if (myScale.begin() == false)
    {
        Serial.println("Scale not detected. Please check wiring. Freezing...");
        while (1);
    }
    Serial.println("Scale detected!");

    readSettingsRequest(partID, scaleID); //Load zeroOffset, calibrationFactor, and partWeight from server
    myScale.setSampleRate(NAU7802_SPS_320); // Increase to max sample rate
    myScale.calibrateAFE(); // Re-cal analog front end when we change gain, sample rate, or channel 

    Serial.print("Zero offset: ");
    Serial.println(myScale.getZeroOffset());
    Serial.print("Calibration factor: ");
    Serial.println(myScale.getCalibrationFactor());
    if(myScale.getZeroOffset()==0 && myScale.getCalibrationFactor()==0){
      Serial.println("Scale not calibrated. Entering calibration");
      calibrateScale();
    }
}

void loop()
{
  if(myScale.available() == true) // Returns true if Cycle Ready bit is set (conversion is complete)
  {    
    long currentReading = myScale.getReading(); // Returns 24-bit reading.
    float currentWeight = myScale.getWeight(); // Once you've set zero offset and cal factor, you can ask the library to do the calculations for you
    Serial.print("Reading: ");
    Serial.print(currentReading);
    Serial.print("\tWeight: ");
    Serial.print(currentWeight, 2); // Print 2 decimal places

    avgWeights[avgWeightSpot++] = currentWeight;
    if(avgWeightSpot == AVG_SIZE) avgWeightSpot = 0;
    
    float avgWeight = 0;
    for (int x = 0 ; x < AVG_SIZE ; x++) avgWeight += avgWeights[x];
    
    avgWeight /= AVG_SIZE;

    Serial.print("\tAvgWeight: ");
    Serial.print(avgWeight, 2); // Print 2 decimal places

    lastPartNumber = numberParts;
    numberParts = round(avgWeight/partWeight);
    Serial.print("\tnumberParts: ");
    Serial.println(numberParts); 
    
    if(numberParts != lastPartNumber) { partChanged = true; }
    // Send request only if number of parts has changed
    if(partChanged){
      // Make a HTTP PUT request to update the part:
      updatePartRequest(partID,scaleID,numberParts);    
      partChanged = false;
    }

    if(settingsDetected == false) Serial.print("\tScale not calibrated. Press 'c'.");
    Serial.println();

    if (Serial.available())
    {
      byte incoming = Serial.read();
      if (incoming == 't') // Tare the scale
        myScale.calculateZeroOffset();
      else if (incoming == 'c') // Calibrate
        calibrateScale();
    }
  }
}

// Gives user the ability to set a known weight on the scale and calculate a calibration factor, as well as entering weight of store part
void calibrateScale(void)
{
  Serial.println();
  Serial.println();
  Serial.println("Scale calibration");

  Serial.println("Setup scale with no weight on it. Press a key when ready.");
  while (Serial.available()) Serial.read();  // Clear anything in RX buffer
  while (Serial.available() == 0) delay(10); // Wait for user to press key

  myScale.calculateZeroOffset(64); // Zero or Tare the scale. Average over 64 readings
  Serial.print("New zero offset: ");
  Serial.println(myScale.getZeroOffset());

  Serial.println("Place known weight on scale. Press a key when weight is in place and stable.");
  while (Serial.available()) Serial.read();  // Clear anything in RX buffer
  while (Serial.available() == 0) delay(10); // Wait for user to press key

  Serial.print("Please enter the weight, without units, currently sitting on the scale (for example '4.25'): ");
  while (Serial.available()) Serial.read();  // Clear anything in RX buffer
  while (Serial.available() == 0) delay(10); // Wait for user to press key

  // Read user input
  float weightOnScale = Serial.parseFloat();
  Serial.println();

  myScale.calculateCalibrationFactor(weightOnScale, 64); // Tell the library how much weight is currently on it
  Serial.print("New cal factor: ");
  Serial.println(myScale.getCalibrationFactor(), 2);

  Serial.print("New Scale Reading: ");
  Serial.println(myScale.getWeight(), 2);
  Serial.println();

  Serial.print("Please enter the weight of the part to be stored, without units.");
  while (Serial.available()) Serial.read(); // Clear anything in RX buffer
  while (Serial.available() == 0) delay(10); // Wait for user to press key

  partWeight = Serial.parseFloat();

  Serial.print("Part weight: ");
  Serial.println(partWeight);
  Serial.println();

  Serial.println("Please enter the name of the part to be stored, don't include / or spaces.");
  while (Serial.available()) Serial.read(); // Clear anything in RX buffer
  while (Serial.available() == 0) delay(10); // Wait for user to press key

  newPartID = Serial.readStringUntil('\n');

  Serial.print("Part name: ");
  Serial.println(newPartID);
  Serial.println();
  if(newPartID != ""){
    partID=newPartID;
    // Make a HTTP POST request to set up the part:
    partSetupRequest(partID, scaleID);
    }
  updatePartRequest(partID,scaleID,numberParts);      
  // Commit these values to server
  // Make a HTTP PUT request to calibrate the part:
  calibrationRequest(partID,scaleID,partWeight,myScale.getZeroOffset(),myScale.getCalibrationFactor());
  settingsDetected = true;
}

// Reads the current system settings from server
// If anything looks weird, reset setting to default value
void readSettingsRequest(String partID, String scaleID)
{
  float settingCalibrationFactor; // Value used to convert the load cell reading to lbs or kg
  long settingZeroOffset; // Zero value that is found when scale is tared
  float settingPartWeight;  // Weight of the part that's stored
  if (client.connect(server, PORT)) {
      Serial.println("Connected to server");
      Serial.println("Will read settings...");
      // Make a HTTP POST request to set up the part:
      client.println("GET /parts/info/"+scaleID+"/"+partID);
      client.println();
      delay(1000);
      StaticJsonDocument<256> info;
      String line;
      while(client.available()){
        line = client.readStringUntil('\r');
      }
      deserializeJson(info, line);
      // Look up the calibration factor
      settingCalibrationFactor = info["calibration_factor"];
      // Look up the zero tare point
      settingZeroOffset = info["zero_offset"];
      // Look up the part weight
      settingPartWeight = info["weight"];
      } else{
      Serial.println("Failed to connect to server");
    }
  // Pass these values to the library
  myScale.setCalibrationFactor(settingCalibrationFactor);
  myScale.setZeroOffset(settingZeroOffset);
  // Pass the value the global variable
  partWeight = settingPartWeight;

  settingsDetected = true; // Assume for the moment that there are good cal values
  if (settingCalibrationFactor == 0 || settingZeroOffset == 0)
    settingsDetected = false; // Defaults detected. Prompt user to cal scale.
}

void partSetupRequest(String partID, String scaleID){
    if (client.connect(server, PORT)) {
      Serial.println("Connected to server");
      // Make a HTTP request:
      client.println("POST /parts/?scaleID="+scaleID+"&name="+partID);
      client.println();
    } else {
      Serial.println("Failed to connect to server");
    }
}

void updatePartRequest( String partID, String scaleID, int quantity ){
  if (client.connect(server, PORT)) {
      Serial.println("Connected to server");
      // Make a HTTP request:
      client.println("PUT /parts/"+scaleID+"/"+partID+"?quantity="+String(quantity));
      client.println();
    } else {
      Serial.println("Failed to connect to server");
    }
}

void calibrationRequest( String partID, String scaleID, float weight, int zero_offset, float calibration_factor){
  if (client.connect(server, PORT)) {
    Serial.println("Connected to server");
    Serial.println("Will calibrate");
    // Make a HTTP request:
    client.println("PUT /parts/calibration/"+scaleID+"/"+partID+"?weight="+String(weight)+"&zero_offset="+String(zero_offset)+"&calibration_factor="+String(calibration_factor));
    client.println();
  } else{
    Serial.println("Failed to connect to server");
  }
}
