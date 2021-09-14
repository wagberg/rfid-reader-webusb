import serial

def main():
    beep = b'\xAA\xDD\x00\x04\x01\x03\x05\x07'
    get_id = b'\xAA\xDD\x00\x03\x01\x02\x03'
    green = b'\xAA\xDD\x00\x04\x01\x04\x02\x07'
    red = b'\xAA\xDD\x00\x04\x01\x04\x01\x04'
    with serial.Serial('/dev/ttyUSB4',38400,timeout=2) as ser:
        # ser.write(beep)
        # s = ser.read(100)
        # print(s)
        # ser.write(get_id)
        # s = ser.read(100)
        # print(s)
        # ser.write(green)
        # s = ser.read(100)
        # print(s)
        ser.write(red)

if __name__ == "__main__":
    main()

