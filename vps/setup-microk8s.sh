#!/bin/bash

set -euo pipefail

echo "Starting MicroK8s setup (no MetalLB)..."

# Update and install snapd if missing
sudo apt update
sudo apt install -y snapd

# Install MicroK8s stable (latest)
sudo snap install microk8s --classic

# Add current user to microk8s group
sudo usermod -a -G microk8s $USER
sudo chown -f -R $USER ~/.kube || true

echo "You may need to logout/login for group changes to take effect."

# Alias kubectl for convenience
sudo snap alias microk8s.kubectl kubectl

# Enable core addons
microk8s enable dns
microk8s enable helm3
microk8s enable hostpath-storage
microk8s enable metrics-server
microk8s enable registry

# Enable community addons repository
microk8s enable community

# Enable istio (community addon)
microk8s enable istio

# Enable observability (includes Prometheus, Loki, Tempo, Grafana)
microk8s enable observability

# Wait for observability stack pods to be ready
echo "Waiting for observability stack pods to be ready..."
microk8s kubectl -n observability wait --for=condition=Ready pods --all --timeout=300s

# Display status summary
microk8s status --wait-ready

echo "MicroK8s installation and addon enablement complete."
echo "Use 'microk8s kubectl' or 'kubectl' (if alias set) to interact with the cluster."
