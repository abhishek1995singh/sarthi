#!/bin/sh
set -eu

# Convert Railway/Render DATABASE_URL (postgresql://...) into Spring JDBC props
if [ -n "${DATABASE_URL:-}" ]; then
  url="$DATABASE_URL"
  case "$url" in
    postgres://*) url="postgresql://${url#postgres://}" ;;
  esac
  case "$url" in
    postgresql://*)
      rest="${url#postgresql://}"
      userinfo="${rest%%@*}"
      hostpart="${rest#*@}"
      if [ "$userinfo" != "$rest" ]; then
        export SPRING_DATASOURCE_USERNAME="${userinfo%%:*}"
        pass="${userinfo#*:}"
        if [ "$pass" != "$userinfo" ]; then
          export SPRING_DATASOURCE_PASSWORD="$pass"
        fi
        export SPRING_DATASOURCE_URL="jdbc:postgresql://${hostpart}"
      else
        export SPRING_DATASOURCE_URL="jdbc:postgresql://${rest}"
      fi
      ;;
    jdbc:*)
      export SPRING_DATASOURCE_URL="$url"
      ;;
  esac
fi

exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -jar /app/app.jar
