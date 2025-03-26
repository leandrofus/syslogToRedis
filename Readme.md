# Syslog To Rely Server 

### lightweight tool to to forward syslog messages to an external server using redis

You can use this to receive syslog messages and push it into your real syslog server. Dont overhelm your applications anymore if your syslog server go down or in a mantenance window

By default it will listen TCP/UDP on 514 container internal port.

```
docker run -d -e REDIS_HOST=10.10.0.21 -e REDIS_PORT=6379 -e REDIS_CHANNEL=test -e SYSLOG_HOST=10.10.0.3 -e SYSLOG_PORT=514 -e SYSLOG_PROTOCOL=udp -p 514:514 -p514:514/udp --name syslog-rely-server syslog-rely-server
```

Be carefull dont overlap `SYSLOG_HOST` `SYSLOG_PORT` with the container listerners or will enter in a endless loop


[Source code](https://github.com/leandrofus/syslogToRedis)
## Leandro Fusco - Thel2o