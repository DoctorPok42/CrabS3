FROM alpine:3.20

RUN apk add --no-cache curl

COPY crontab /etc/crontabs/root
COPY entrypoint.sh /entrypoint.sh
COPY check-expired.sh /usr/local/bin/check-expired.sh

RUN chmod +x /entrypoint.sh /usr/local/bin/check-expired.sh

ENTRYPOINT ["/entrypoint.sh"]
