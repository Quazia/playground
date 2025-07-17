# Use official Node.js runtime as base image
FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    postgresql-client \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry (Solidity toolchain)
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN foundryup

# Create non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user if it doesn't exist
RUN if ! id -u $USERNAME > /dev/null 2>&1; then \
        groupadd --gid $USER_GID $USERNAME \
        && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME; \
    fi

# Add user to sudoers
RUN apt-get update && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Install global npm packages
RUN npm install -g typescript ts-node nodemon @types/node

# Set up workspace
WORKDIR /workspace

# Copy foundry to user's path
USER $USERNAME
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/home/node/.foundry/bin:${PATH}"
RUN /home/node/.foundry/bin/foundryup || echo "Foundry installation completed"

# Switch back to root for final setup
USER root

# Set the default user
USER $USERNAME

# Keep container running
CMD ["sleep", "infinity"]
