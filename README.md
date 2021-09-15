# rfid-reader-webusb
Web app for China 125 kHz rfid reader and writer.

Hosted here: https://wagberg.github.io/rfid-reader-webusb/

## Supported reader
This app supports the following vendor and product ID:

    ID 067b:2303 Prolific Technology, Inc. PL2303 Serial Port

The reader uses a Prolific PL2303 USB-to-serial converter to communicate via USB.

## Serial or USB
The app uses both the Web Serial API and the Web USB API to communicate with the reader.
For operating systems where a driver for the PL2303 chip is already loaded and the Web Serial API is supported, choose `Connect serial`.

The Web Serial API is currently only supoorted by Chrome in desktop environemnts.
For mobile use (currently only Android) the Web USB API is used to emulate a serial port.

## Notes on using USB
Many Linux based operating systems ship with a PL2303 driver.
When the USB device is detected, the driver is automatically loaded and the interfaces used for communication are claimed by the this driver, locking the USB for other applications.
To circumvent this in e.g. Ubuntu, the driver must be unloaded.
This can be done by calling
    
    echo -n "1-2:1.0" > /sys/bus/usb/drivers/pl2303/unbind

The driver can be loaded again by calling

    echo -n "1-2:1.0" > /sys/bus/usb/drivers/pl2303/bind

The USB address can be found running `dmesg`.

On Android, this is currently not possible (without rooting).
However, there are ongoing discussions to whitelist certain USB devices that will allow the driver to be unloaded automatically by Chrome when the user requests control over the device.
When this gets implementeds ,this app will probably work on Android.

## References
* The protocol used by the reader is described [here](https://www.triades.net/13-geek/13-serial-protocol-for-a-chinese-rfid-125khz-reader-writer.html).
* A C++ implementation can be found [here](https://github.com/merbanan/rfid_app).
