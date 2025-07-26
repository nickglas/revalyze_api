#!/bin/bash

set -euo pipefail

echo "Starting MicroK8s setup (with persistent storage configuration)..."

# Update and install snapd if missing
sudo apt update
sudo apt install -y snapd

# Install MicroK8s stable
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

# Enable istio
microk8s enable istio

# Enable observability
microk8s enable observability

# --- PERSISTENT STORAGE CONFIGURATION ---
echo "Configuring persistent storage..."

# 1. Create dedicated storage class for MongoDB with Retain policy
cat <<EOF | microk8s kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mongo-retain
provisioner: microk8s.io/hostpath
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
EOF

# 2. Make mongo-retain the default storage class
microk8s kubectl patch storageclass microk8s-hostpath -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
microk8s kubectl patch storageclass mongo-retain -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# 3. Create persistent volume directory
sudo mkdir -p /var/snap/microk8s/common/mongo-storage
sudo chmod 777 /var/snap/microk8s/common/mongo-storage

# --- VERIFY STORAGE SETUP ---
echo "Verifying storage configuration..."
microk8s kubectl get sc -o wide

# Wait for observability stack pods to be ready
echo "Waiting for observability stack pods to be ready..."
microk8s kubectl -n observability wait --for=condition=Ready pods --all --timeout=300s

# Display status summary
microk8s status --wait-ready

echo "MicroK8s installation complete with persistent storage setup."
echo "Default storage class set to 'mongo-retain' with Retain policy."
echo "Use 'microk8s kubectl' or 'kubectl' to interact with the cluster."