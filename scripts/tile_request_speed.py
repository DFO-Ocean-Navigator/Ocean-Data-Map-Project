import time
import requests




def send_req():
        """
        This method sends the requests to the given url and logs the results and time
        taken. It also handles and logs raised exceptions.
        """
        url = 'http://localhost:8443/api/v2.0/tiles/giops_day/votemper/2337379200/0/4/9/3?projection=EPSG:3857&scale=-5,30&interp=gaussian&radius=25&neighbours=10'
        start_time = time.time()

        resp = requests.get(url, verify=False)
        end_time = time.time()

        if resp.status_code == 200:
            total_time = end_time - start_time
            return total_time

sum_total = 0
total_req = 0
for i in range(1000):
     print(i)
     request_time = send_req()
     if request_time:
        sum_total = sum_total + request_time
        total_req = total_req + 1

print("successful requests: ",(total_req))
print("total request time: ",sum_total)
print("average request time: ",(sum_total/total_req))

#data = r.get(dataset)
#if (data):
    #   print("accessed redis")
    #   return data
#r.set(dataset, data)