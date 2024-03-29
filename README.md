# Intelligent Storage System

An IoT system to monitor storage of materials in bins. A web interface is used to display the information of quantity over time, and other data, of the stock:

![web-gui](https://github.com/javierb07/storage-system/blob/master/images/system-info.jpeg)

The system is containerized in Docker images to deploy the server and a webcam using balena: https://www.balena.io/

A storage unit consists of a bin, a microcontroller with WiFi capabilities, a load cell, and a load cell amplifier. The hardware setup can be seen in the following picture:

![hardware](https://github.com/javierb07/storage-system/blob/master/images/electronics-setup.jpeg)

The system was developed with the following elements:

1. ESP32 Microcontroler
2. Load cell: Load Cell - 5kg, Straight Bar (TAL220B) https://www.sparkfun.com/products/14729
3. Load cell amplifier: https://www.sparkfun.com/products/15242
4. AkroBins: https://www.amazon.com/Akro-Mils-08212Blue-Stacking-AkroBins-Hardware/dp/B01AADDCF6/ref=sr_1_49?dchild=1&keywords=bins&qid=1588719027&sr=8-49&pldnSite=1
5. Custom parts, laser cut and 3D printed

Uploading the code in storage_scale to the microcontroller a new entry in the server should be automatically added.

The final setup of the prototype looks like this:

![setup](https://github.com/javierb07/storage-system/blob/master/images/iss-setup.jpeg)
