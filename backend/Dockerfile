FROM golang:1.26-alpine AS build

WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/voyagex-backend ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/voyagex-backend /voyagex-backend
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/voyagex-backend"]
