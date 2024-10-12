# Define custom function directory
ARG APP_DIR="/app"

# First stage: Build stage
FROM public.ecr.aws/eks-distro-build-tooling/nodejs:16.18.1-gcc-al23 as build-image

# Install build tools and necessary libraries
RUN yum update -y && \
    yum install -y gcc-c++ make tar wget && \
    yum install -y glib2-devel expat-devel libjpeg-devel libpng-devel libtiff-devel \
    libgsf-devel librsvg2-devel orc-devel gobject-introspection-devel

# Download and compile libvips from source
WORKDIR /tmp
RUN wget https://github.com/libvips/libvips/releases/download/v8.14.3/vips-8.14.3.tar.gz && \
    tar xzf vips-8.14.3.tar.gz && \
    cd vips-8.14.3 && \
    ./configure --prefix=/usr && \
    make && \
    make install


# Copy function code
COPY . .

WORKDIR $APP_DIR

# Install Node.js dependencies, including Sharp (which depends on libvips)
RUN npm install

# Second stage: Production stage using AWS ECR Node.js image
#FROM public.ecr.aws/eks-distro-build-tooling/nodejs:16.18.1-al2023

# Copy the application code and dependencies from the build stage
#COPY --from=build-image /app /app

# Copy vips binaries and libraries from the build-image stage
#COPY --from=build-image /usr/lib64 /usr/lib64
#COPY --from=build-image /usr/bin/vips* /usr/bin/

#WORKDIR /app

# Expose the port the app runs on
EXPOSE 80

# Start the application
CMD ["node", "index.js"]
