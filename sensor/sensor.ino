#include <stdio.h>
#include <SPI.h>

#include <GY953.h>


GY953 mag = GY953(10, 2);


void setup() {
  Serial.begin(115200);
  long unsigned debug_start = millis();
  while (!Serial && ((millis() - debug_start) <= 5000));
  mag.begin();
  mag.setRefreshRate(50);
}


void loop() {
  char buffer[100] = {0};
    
  // Listen to the serial port for instructions.
  // 0: Set the refresh rate to 50Hz.
  // 1: Set the refresh rate to 100Hz.
  // 2: Set the refresh rate to 200Hz.
  // 3: Read accuracy.
  // 4: Read range.
  while (Serial.available()) {
    char instruction = Serial.read();
    byte data[4] = {0};
    
    switch (instruction) {
      case 0:
        mag.setRefreshRate(50);
        break;
      case 1:
        mag.setRefreshRate(100);
        break;
      case 2:
        mag.setRefreshRate(200);
        break;
      case 3:
        // Accuracy
        // ACC: data[0], 0..3 (less...more accurate)
        // GYR: data[1], 0..3 (less...more accurate)
        // MAG: data[2], 0..3 (less...more accurate)
        // RATE: data[3], 3:50Hz - 4:100Hz - 5:200Hz
        mag.readAccuracy(data);
        sprintf(buffer, "Accuracy - ACC: %d | GYR: %d | MAG: %d | RATE: %d",\
                data[0], data[1], data[2], data[3]);
        Serial.println(buffer);
        break;
      case 4:
        // Range
        // ACC: data[0], 0 (+-2g)
        // GYR: data[1], 3 (+-2000dps/s)
        // MAG: data[2], 1 (16bit)
        mag.readRange(data);
        sprintf(buffer, "Range - ACC: %d | GYR: %d | MAG: %d",\
                data[0], data[1], data[2]);
        Serial.println(buffer);
        break;
    }
  }

  // Send sensor data.
  if (mag.update()) {
    int data[4] = {0};

    mag.getRPY(data);  // Roll, Pitch, Yaw
    sprintf(buffer, "RPY - Roll: %d | Pitch: %d | Yaw: %d",\
            data[0], data[1], data[2]);
    Serial.println(buffer);
    
    mag.getACC(data);  // x, y, z, 0
    sprintf(buffer, "ACC - x: %d | y: %d | z: %d",\
            data[0], data[1], data[2]);
    Serial.println(buffer);
    
    mag.getGYR(data);  // x, y, z, 0
    sprintf(buffer, "GYR - x: %d | y: %d | z: %d",\
            data[0], data[1], data[2]);
    Serial.println(buffer);
    
    mag.getMAG(data);  // x, y, z, 0
    sprintf(buffer, "MAG - x: %d | y: %d | z: %d",\
            data[0], data[1], data[2]);
    Serial.println(buffer);

    Serial.println("END");
  }
}
