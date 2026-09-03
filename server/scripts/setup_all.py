import sys
import time
import importlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

def main():
    t0 = time.time()
    
    print("Step 1/4: Initializing database and schedules...")
    step1 = importlib.import_module("server.scripts.01_setup_database")
    step1.main()

    print("\nStep 2/4: Generating synthetic operational training dataset...")
    step2 = importlib.import_module("server.scripts.02_generate_training")
    step2.generate_training_dataset()

    print("\nStep 3/4: Training Model A (LightGBM) & calibrating CQR...")
    step3 = importlib.import_module("server.scripts.03_train_model")
    step3.main()

    print("\nStep 4/4: Training Model B (ST-GCN) & fitting Ridge Meta-Learner...")
    step4 = importlib.import_module("server.scripts.04_train_stgcn")
    step4.train_stgcn()

    elapsed = time.time() - t0
    print(f"\nAll components initialized and trained in {elapsed:.2f}s!")

if __name__ == "__main__":
    main()
