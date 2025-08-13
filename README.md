# Kubernetes & Docker Setup and Management

## Docker Compose Build
```bash
docker compose up --build

#dev
docker compose -f docker-compose-dev.yml up --build
```

## Setup
```bash
kubectl apply -f mongo-deployment.yaml
kubectl apply -f my-demo1-app.yaml
kubectl apply -f monitoring-stack.yaml

kubectl port-forward svc/grafana  33005:3000 &
kubectl port-forward svc/loki     33105:3100 &
kubectl port-forward svc/prometheus 9097:9090 &
```

## List Resources
```bash
kubectl get pods
kubectl get services
kubectl get pods -l app=my-demo1-app
kubectl get hpa my-demo1-app-hpa -w
```

## Delete Resources
```bash
kubectl delete all --all
pkill -f "kubectl port-forward"
```

## Other Resources
```bash
kubectl delete services --all
kubectl delete deployments --all
kubectl delete hpa my-demo1-app-hpa
```

## API Call
```bash
npx autocannon -c 20 -d 240 http://localhost:31010/users
```

---

## Grafana
- URL: [http://localhost:33005/?orgId=1](http://localhost:33005/?orgId=1)  
- Username: `admin`  
- Default Password: `admin`  
- New Password: `Admin@123456`  
- Node.js Dashboard ID: `11159`

## Prometheus
- URL: `http://prometheus.default.svc.cluster.local:9097`

## Loki
- URL: `http://loki.default.svc.cluster.local:33105`

---

## Additional Commands
```bash
export KUBE_EDITOR="nano"

kubectl logs deployment/my-demo1-app

kubectl delete deployment my-demo1-app
kubectl delete deployment mongo
kubectl rollout restart deployment/my-demo1-app
kubectl rollout history deployment my-demo1-app

# Undo rollout if new docker image breaks deployment
kubectl rollout undo deployment my-demo1-app

# Restart deployment (stop old pods, start new pod)
kubectl rollout restart deployment my-demo1-app
```