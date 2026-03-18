from fastapi import FastAPI
import uvicorn

# Initialize the 'Brain'
app = FastAPI()

# This is a basic 'Health Check' to see if the bridge works
@app.get("/")
def read_root():
    return {"status": "online", "message": "Remi's Brain is Connected"}

# This is where we will add Sultan's login later
@app.get("/login/{patient_id}")
def login(patient_id: str):
    return {"message": f"Hello, I am ready to help {patient_id}"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)