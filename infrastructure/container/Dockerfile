# Define custom function directory
ARG APP_DIR="/app"

# First stage: Build stage
FROM public.ecr.aws/eks-distro-build-tooling/nodejs:16.18.1-gcc-al23 as build-image

# Install dependencies required for libvips
RUN yum update -y && \
    yum install -y vips vips-devel

# Copy function code
COPY . .

WORKDIR $APP_DIR

# Install Node.js dependencies, including Sharp (which depends on libvips)
RUN npm install

# Second stage: Production stage using AWS ECR Node.js image
FROM public.ecr.aws/eks-distro-build-tooling/nodejs:16.18.1-al2023

# Copy the application code and dependencies from the build stage
COPY --from=build-image /app /app

# Copy vips binaries and libraries from the build-image stage
COPY --from=build-image /usr/lib64 /usr/lib64
COPY --from=build-image /usr/bin/vips* /usr/bin/

WORKDIR /app

# Expose the port the app runs on
EXPOSE 80

# Start the application
CMD ["node", "index.js"]
