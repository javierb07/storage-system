// Import necessary libraries
#include <Wire.h>   // I2C protocol library
#include <SparkFun_Qwiic_Scale_NAU7802_Arduino_Library.h>   // Qwiic scale library by SparkFun
#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>

NAU7802 myScale; // Create instance of the NAU7802 class

bool settingsDetected = false; // Used to prompt user to calibrate their scale

// Create an array to take average of weights. This helps smooth out jitter
#define AVG_SIZE 10
float avgWeights[AVG_SIZE];
byte avgWeightSpot = 0;

// Container information
String containerMongoID;
String containerID = "Container 1";  // Set name of container
String localURL;

// Part information
String partMongoID;
String partID;
float partWeight = 0;
float zero_offset = 0;
float calibration_factor = 0;
int numberParts = 0;

// Other variables needed
bool partFound = false;
bool partChanged = false;
int lastPartNumber = 0;

// Wi-Fi connection 
char* ssid = "";
char* password = "";
String token = "CDesignLabToken";
int PORT = 80;
IPAddress server(192,168,0,10);  
WiFiClient wifi;  // Initialize the client library
HttpClient client = HttpClient(wifi, server, PORT);

// Calibration server
WiFiServer serverCal(80); // Server for calibration purpouses
bool alreadyConnected = false; // whether or not the client was connected previously
String header;  // Variable to store the HTTP request
unsigned long currentTime = millis(); // Current time
unsigned long previousTime = 0; // Previous time
const long timeoutTime = 2000;  // Define timeout time in milliseconds (example: 2000ms = 2s)
bool calibrateServer = false;

void setup() {
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
    localURL = WiFi.localIP().toString();
    serverCal.begin();

    // Check if a container associated with the current local IP already exists
    if (!findContainerByURLRequest(localURL)){
      // Make a HTTP POST request to set up the container:
      containerSetupRequest(containerID, localURL);
    }
    // If there is no part associated to the container create one
    if (!partFound){
      partSetupRequest(containerMongoID);
    }
    
    Wire.begin(); // Initiate the Wire library and join the I2C bus as a master or slave
    Wire.setClock(400000); // Qwiic Scale is capable of running at 400kHz if desired
    if (myScale.begin() == false) {
      Serial.println("Scale not detected. Please check wiring. Freezing...");
      while (1);
    }
    Serial.println("Scale detected!");

    myScale.setSampleRate(NAU7802_SPS_320); // Increase to max sample rate
    myScale.calibrateAFE(); // Re-cal analog front end when we change gain, sample rate, or channel 

    Serial.print("Zero offset: ");
    Serial.println(myScale.getZeroOffset());
    Serial.print("Calibration factor: ");
    Serial.println(myScale.getCalibrationFactor());
    if(myScale.getZeroOffset()==0 && myScale.getCalibrationFactor()==0){
      Serial.println("Scale not calibrated. Entering calibration");
      calibrateScaleServer();
    }
}

void loop() {
  if(myScale.available() == true) { // Returns true if Cycle Ready bit is set (conversion is complete)     
    // Raw readings
    long currentReading = myScale.getReading(); // Returns 24-bit reading.
    float currentWeight = myScale.getWeight(); // Once you've set zero offset and cal factor, you can ask the library to do the calculations for you
    Serial.print("Reading: ");
    Serial.print(currentReading);
    Serial.print("\tWeight: ");
    Serial.print(currentWeight, 2); // Print 2 decimal places
    // Weight calculations
    avgWeights[avgWeightSpot++] = currentWeight;
    if(avgWeightSpot == AVG_SIZE) { avgWeightSpot = 0; } 
    float avgWeight = 0;
    for (int x = 0 ; x < AVG_SIZE ; x++) { avgWeight += avgWeights[x]; }
    avgWeight /= AVG_SIZE;
    Serial.print("\tAvgWeight: ");
    Serial.print(avgWeight, 2); // Print 2 decimal places
    // Number of parts calculations
    lastPartNumber = numberParts;
    numberParts = round(avgWeight/partWeight);
    Serial.print("\tnumberParts: ");
    Serial.println(numberParts); 
    if(numberParts != lastPartNumber) { partChanged = true; }
    // Send request only if number of parts has changed
    if(partChanged){
      // Make a HTTP PUT request to update the part:
      updatePartRequest(containerMongoID, partMongoID, partID, partWeight, myScale.getZeroOffset(), myScale.getCalibrationFactor(), numberParts);      
      partChanged = false;
    }
    // Calibration handling section
    if(settingsDetected == false) { Serial.print("\tScale not calibrated. Press 'c'."); }
    Serial.println();
    if (Serial.available()) {
      byte incoming = Serial.read();
      if (incoming == 't') { myScale.calculateZeroOffset(); } // Tare the scale 
      else if (incoming == 'c') { calibrateScaleSerial(); } // Calibrate
    }
    listenForCalibration();
    if (calibrateServer) { calibrateScaleServer(); }
  }
}

// Function to find if there is already a container with the local IP of the microcontroller in the database
bool findContainerByURLRequest(String localURL){
  Serial.println("making POST request to find a container by URL");
  String contentType = "application/x-www-form-urlencoded";
  String postData = "localURL="+localURL+"&token="+token;   
  client.post("/containers/findByURL", contentType, postData);
  // Read the status code and body of the response
  int statusCode = client.responseStatusCode();
  StaticJsonDocument<300> containerData;
  String info = client.responseBody();  
  deserializeJson(containerData, info);
  containerMongoID = containerData["id"].as<String>();
  Serial.print("Status code: ");
  Serial.println(statusCode);
  Serial.print("Response: ");
  Serial.println(containerMongoID);
  if (containerMongoID != "null"){
    containerID = containerData["nameID"].as<String>();
    partMongoID = containerData["partID"].as<String>();
    if(partMongoID != "null"){
      Serial.println(partMongoID);
      partFound = true;
      partID = containerData["partName"].as<String>();
      partWeight = containerData["weight"];
      zero_offset = containerData["zero_offset"];
      calibration_factor = containerData["calibration_factor"];
      numberParts = containerData["quantity"];
      myScale.setCalibrationFactor(calibration_factor);
      myScale.setZeroOffset(zero_offset);
      settingsDetected = true;
    }
    return true;    
  } else {
    return false;
  }
}

// Set up for a new container in database
void containerSetupRequest(String containerID, String localURL){
  Serial.println("making POST request to set up a container");
  String contentType = "application/x-www-form-urlencoded";
  String postData = "nameID="+containerID+"&localURL="+localURL+"&token="+token;   
  client.post("/containers", contentType, postData);
  // Read the status code and body of the response
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  containerMongoID = response.substring(1,response.length()-1);
  Serial.print("Status code: ");
  Serial.println(statusCode);
  Serial.print("Response: ");
  Serial.println(containerMongoID);  
}

// Set up for a new part in database
void partSetupRequest(String containerMongoID){
  Serial.println("making POST request to set up a part");
  String contentType = "application/x-www-form-urlencoded";
  String postData = "token="+token; 
  client.post("/containers/"+containerMongoID, contentType, postData);
  // Read the status code and body of the response
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  partMongoID = response.substring(1,response.length()-1);
  Serial.print("Status code: ");
  Serial.println(statusCode);
  Serial.print("Response: ");
  Serial.println(partMongoID);  
}

// Update a part with all information in database
void updatePartRequest(String containerMongoID, String partMongoID, String partID, float weight, int zero_offset, float calibration_factor, int quantity){
  Serial.println("making PUT request to update a part");
  String contentType = "application/x-www-form-urlencoded";
  String putData = "nameID="+partID+"&weight="+weight+"&zero_offset="+zero_offset+"&calibration_factor="+calibration_factor+"&quantity="+quantity+"&token="+token;   
  String route = "/containers/"+containerMongoID+"/"+partMongoID;
  client.put(route, contentType, putData);
  // Read the status code and body of the response
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();  
  Serial.print("Status code: ");
  Serial.println(statusCode);
  Serial.print("Response: ");
  Serial.println(response);  
}

// Gives user the ability to set a known weight on the scale and calculate a calibration factor, as well as entering weight of a part using a server
void calibrateScaleServer(void) {
  Serial.println();
  Serial.println();
  Serial.println("Scale calibration");

  bool calibrating = true;
  bool zero_offset_done = false;
  bool weight_on_scale = false;
  bool part_weight_set = false;
  while (calibrating) {
    WiFiClient clientCal = serverCal.available();  
    if (clientCal) {
      Serial.println("New Client.");          // Print a message out in the serial port
      String currentLine = "";                // Make a string to hold incoming data from the client
      currentTime = millis();
      previousTime = currentTime;
      while (clientCal.connected() && currentTime - previousTime <= timeoutTime) { // Loop while the client's connected
        currentTime = millis();
        if (clientCal.available()) {             // if there's bytes to read from the client,
          char c = clientCal.read();             // read a byte, then
          Serial.write(c);                    // print it out the serial monitor
          header += c;
          if (c == '\n') {                    // If the byte is a newline character
            // if the current line is blank, you got two newline characters in a row.
            // that's the end of the client HTTP request, so send a response:
            if (currentLine.length() == 0) {
              // HTTP headers always start with a response code (e.g. HTTP/1.1 200 OK)
              // and a content-type so the client knows what's coming, then a blank line:
              clientCal.println("HTTP/1.1 200 OK");
              clientCal.println("Content-type:text/html");
              clientCal.println("Connection: close");
              clientCal.println("Access-Control-Allow-Origin: *");
              clientCal.println();
              // Routes
              if (header.indexOf("GET /zero_offset") >= 0) {
                myScale.calculateZeroOffset(64); // Zero or Tare the scale. Average over 64 readings
                Serial.print("New zero offset: ");
                Serial.println(myScale.getZeroOffset());
                clientCal.println("weight_value");
                zero_offset_done = true;
              } else if (header.indexOf("POST /weight_value") >= 0 && zero_offset_done) {
                Serial.print("Current weight: ");
                String response = clientCal.readString();
                Serial.println(  response);
                float weightOnScale = response.toFloat();
                myScale.calculateCalibrationFactor(weightOnScale, 64); // Tell the library how much weight is currently on it
                Serial.print("New cal factor: ");
                Serial.println(myScale.getCalibrationFactor(), 2);
                clientCal.println("part_weight");
                weight_on_scale = true;
              } else if (header.indexOf("POST /part_weight") >= 0 && weight_on_scale) {
                Serial.print("Part weight: ");
                String response = clientCal.readString();  
                partWeight = response.toFloat();
                Serial.println(partWeight);
                clientCal.println("part_name");
                part_weight_set = true;
              } else if (header.indexOf("POST /part_name") >= 0 && part_weight_set) {
                Serial.print("Part name: ");
                partID = clientCal.readString();  
                Serial.println(partID);
                clientCal.println("done");
                calibrating = false;
              }
              // The HTTP response ends with another blank line
              clientCal.println();
              // Break out of the while loop
              break;
            } else { // if you got a newline, then clear currentLine
              currentLine = "";
            }
          } else if (c != '\r') {  // if you got anything else but a carriage return character,
            currentLine += c;      // add it to the end of the currentLine
          }
        }
      }
      // Clear the header variable
      header = "";
      // Close the connection
      clientCal.stop();
      Serial.println("Client disconnected.");
      Serial.println("");
    }
  }
  calibrateServer = false; 
  updatePartRequest(containerMongoID, partMongoID, partID, partWeight, myScale.getZeroOffset(), myScale.getCalibrationFactor(), 0);   
  settingsDetected = true;   
}

// Gives user the ability to set a known weight on the scale and calculate a calibration factor, as well as entering weight of stored part thorugh serial communication
void calibrateScaleSerial(void) {
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

  partID = Serial.readStringUntil('\n');
  Serial.print("Part name: ");
  Serial.println(partID);
  Serial.println();

  updatePartRequest(containerMongoID, partMongoID, partID, partWeight, myScale.getZeroOffset(), myScale.getCalibrationFactor(), 0);   
  settingsDetected = true;   
}

// Function that listen for a calibration queue to trigger calibration function if the system is already running
void listenForCalibration(void){ 
  WiFiClient clientCal = serverCal.available();  
  if (clientCal) {
    Serial.println("New Client.");          // Print a message out in the serial port
    String currentLine = "";                // Make a string to hold incoming data from the client
    currentTime = millis();
    previousTime = currentTime;
    while (clientCal.connected() && currentTime - previousTime <= timeoutTime) { // Loop while the client's connected
      currentTime = millis();
      if (clientCal.available()) {             // if there's bytes to read from the client,
        char c = clientCal.read();             // read a byte, then
        Serial.write(c);                    // print it out the serial monitor
        header += c;
        if (c == '\n') {                    // If the byte is a newline character
          // if the current line is blank, you got two newline characters in a row.
          // that's the end of the client HTTP request, so send a response:
          if (currentLine.length() == 0) {
            // HTTP headers always start with a response code (e.g. HTTP/1.1 200 OK)
            // and a content-type so the client knows what's coming, then a blank line:
            clientCal.println("HTTP/1.1 200 OK");
            clientCal.println("Content-type:text/html");
            clientCal.println("Connection: close");
            clientCal.println("Access-Control-Allow-Origin: *");
            clientCal.println();
            // Routes
            if (header.indexOf("GET /calibration") >= 0) {
              calibrateServer = true;
              clientCal.println("calibration");
            } 
            // The HTTP response ends with another blank line
            clientCal.println();
            // Break out of the while loop
            break;
          } else { // if you got a newline, then clear currentLine
            currentLine = "";
          }
        } else if (c != '\r') {  // if you got anything else but a carriage return character,
          currentLine += c;      // add it to the end of the currentLine
        }
      }
    }
    // Clear the header variable
    header = "";
    // Close the connection
    clientCal.stop();
    Serial.println("Client disconnected.");
    Serial.println("");
  }
}
