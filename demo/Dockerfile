# syntax=docker/dockerfile:1.7
# OIE 4.7.0 with Web Support, Role Based Access Control and Flow UI.
# The engine comes from the build context "oie-engine" (see compose.yaml).
ARG BUSYBOX_IMAGE=busybox:1.37.0-glibc@sha256:42a9ff19af33811ee466b24c66384461d37c32dcc28d1d27d49b8aca816bd5ee
ARG NODE_IMAGE=node:22.12.0-alpine

FROM curlimages/curl:8.21.0 AS downloads
# Official archives, checked against their SHA-256.
# Web Support 1.3.0 embeds the web administrator 1.3.0.
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

FROM oie-engine
COPY --from=plugins --chown=engine:engine /extensions/ /opt/engine/extensions/
COPY --from=flow-ui --chown=engine:engine /build/dist/flow-ui/ /opt/engine/extensions/flow-ui/
LABEL org.opencontainers.image.title="OIE 4.7.0, Web Support, RBAC and Flow UI (demo)"
