# webapp
## Command to unload serial driver in linux
1. Find the identity of you usb device. This can be done via `demsg`.
1.  Disconnect using

        echo -n "1-2:1.0" > /sys/bus/usb/drivers/pl2303/unbind

    Connect using

        echo -n "1-2:1.0" > /sys/bus/usb/drivers/pl2303/bind




## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
