# syntax=docker/dockerfile:1.7
# OIE 4.7.0 with Web Support, Role Based Access Control, Community Store, FHIR Data Type and Flow UI.
ARG BUSYBOX_IMAGE=busybox:1.37.0-glibc@sha256:42a9ff19af33811ee466b24c66384461d37c32dcc28d1d27d49b8aca816bd5ee
ARG NODE_IMAGE=node:22.12.0-alpine
ARG OIE_VERSION=4.7.0
ARG OIE_TGZ_URL=https://github.com/OpenIntegrationEngine/engine/releases/download/v${OIE_VERSION}/oie_unix_4_7_0.tar.gz
ARG OIE_TGZ_SHA256=ab08558873dc6be1e474afaacc46efe94d29c945cd3381c10d0ae548ecb429de

FROM curlimages/curl:8.21.0 AS downloads
ARG OIE_TGZ_URL
ARG OIE_TGZ_SHA256

# Official OIE 4.7.0 release archive, verified by SHA-256.
RUN curl --fail --silent --show-error --location --max-time 300 \
      "${OIE_TGZ_URL}" \
      --output /tmp/oie.tar.gz \
    && echo "${OIE_TGZ_SHA256}  /tmp/oie.tar.gz" | sha256sum -c -

# Official archives, checked against their SHA-256.
# Web Support 1.3.0 includes Web Admin 1.3.0.
RUN curl --fail --silent --show-error --location --max-time 300 \
      --header 'Accept: application/octet-stream' \
      https://api.github.com/repos/gibson9583/oie-web-support-plugin/releases/assets/707054284 \
      --output /tmp/websupport.zip \
    && echo '69a6b2285000d6c7356aaa547746528fe0bf145ba9bdf5d595fb9a390aff54ff  /tmp/websupport.zip' | sha256sum -c -

# Role Based Access Control 1.3.0 (diridium-com), for OIE 4.7.0.
RUN curl --fail --silent --show-error --location --max-time 300 \
      https://github.com/diridium-com/role-based-access-control/releases/download/v1.3.0/rbac-1.3.0.zip \
      --output /tmp/rbac.zip \
    && echo 'f540cc77ebfadda88147f07fce412caff41abf30ad302ddca61f0b3f422d0cfd  /tmp/rbac.zip' | sha256sum -c -

# Community Store 0.8.2 (gibson9583), for OIE 4.7.0.
RUN curl --fail --silent --show-error --location --max-time 300 \
      https://github.com/gibson9583/oie-community-store/releases/download/v0.8.2/communitystore-0.8.2.zip \
      --output /tmp/communitystore.zip \
    && echo '3fd4ce3a8ac954e57a941fd30b49e57e6eb91f83f4bdd37a5de5848c8477ad9e  /tmp/communitystore.zip' | sha256sum -c -

# FHIR Data Type 1.6.2, without the POC mapper.
RUN curl --fail --silent --show-error --location --max-time 300 \
      --header 'Accept: application/octet-stream' \
      https://api.github.com/repos/matthydehoog/fhir-datatype-Eclipse-OIE/releases/assets/773430633 \
      --output /tmp/datatype-fhir.zip \
    && echo '845f172761ef63539a2b0fc9a918c6723e646ac3a1bc9c3775a3fd721b822f00  /tmp/datatype-fhir.zip' | sha256sum -c -

FROM ${BUSYBOX_IMAGE} AS oie-dist
COPY --from=downloads /tmp/oie.tar.gz /tmp/oie.tar.gz
RUN mkdir -p /tmp/oie-extract /opt/engine \
    && tar -xzf /tmp/oie.tar.gz -C /tmp/oie-extract \
    && if [ -f /tmp/oie-extract/oieserver ]; then \
         cp -a /tmp/oie-extract/. /opt/engine/; \
       else \
         TOP="$(find /tmp/oie-extract -mindepth 1 -maxdepth 1 -type d | head -n 1)"; \
         cp -a "$TOP"/. /opt/engine/; \
       fi \
    && rm -rf /opt/engine/cli-lib /opt/engine/mirth-cli-launcher.jar /opt/engine/mccommand \
              /opt/engine/manager-lib /opt/engine/mirth-manager-launcher.jar /opt/engine/mcmanager \
              /tmp/oie-extract /tmp/oie.tar.gz \
    && chmod +x /opt/engine/configure-from-env /opt/engine/oieserver

FROM ${BUSYBOX_IMAGE} AS plugins
COPY --from=downloads /tmp/*.zip /downloads/
RUN mkdir -p /extensions \
    && for zip in /downloads/*.zip; do unzip -q "$zip" -d /extensions; done \
    && chmod -R go-w /extensions

FROM ${NODE_IMAGE} AS flow-ui
WORKDIR /build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY build.mjs LICENSE ./
COPY tools ./tools
COPY extension ./extension
COPY src ./src
RUN node build.mjs

FROM eclipse-temurin:21.0.9_10-jre-alpine
RUN apk add --no-cache bash \
    && addgroup -S engine \
    && adduser -S -g engine engine \
    && mkdir -p /opt/engine/appdata /opt/engine/custom-extensions \
    && chown -R engine:engine /opt/engine
WORKDIR /opt/engine
COPY --from=oie-dist --chown=engine:engine /opt/engine/ /opt/engine/
COPY --from=plugins --chown=engine:engine /extensions/ /opt/engine/extensions/
COPY --from=flow-ui --chown=engine:engine /build/dist/flow-ui/ /opt/engine/extensions/flow-ui/
VOLUME /opt/engine/appdata
VOLUME /opt/engine/custom-extensions
EXPOSE 8443
USER engine
ENTRYPOINT ["./configure-from-env"]
CMD ["./oieserver"]
LABEL org.opencontainers.image.title="OIE 4.7.0, Web Support, RBAC, Community Store, FHIR Data Type and Flow UI (demo)"
