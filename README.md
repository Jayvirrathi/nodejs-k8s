docker-compose up --build

# setup
kubectl apply -f mongo-deployment.yaml
kubectl apply -f my-demo1-app.yaml
kubectl apply -f monitoring-stack.yaml

kubectl port-forward svc/grafana  33005:3000 &
kubectl port-forward svc/loki     33105:3100 &
kubectl port-forward svc/prometheus 9097:9090 &


# list 

kubectl get pods
kubectl get services
kubectl get pods -l app=my-demo1-app
kubectl get hpa my-demo1-app-hpa -w


# delete 

kubectl delete all --all
pkill -f "kubectl port-forward"

kubectl delete services --all
kubectl delete deployments --all
kubectl delete hpa my-demo1-app-hpa


# api call
npx autocannon -c 20 -d 240 http://localhost:31010/users

--------

# grafana :
http://localhost:33005/?orgId=1

admin 
Admin@123456

--------

export KUBE_EDITOR="nano"

kubectl logs deployment/my-demo1-app


kubectl delete deployment my-demo1-app
kubectl delete deployment mongo
kubectl rollout restart deployment/my-demo1-app
kubectl rollout history deployment my-demo1-app
 
kubectl rollout undo deployment my-demo1-app
(if applied new docker image after change and use that for deployment and if something breaks in that then deployment will revert back to the previously working version.)
 
kubectl rollout restart deployment my-demo1-app(stop old pods and start new pod)

--------


