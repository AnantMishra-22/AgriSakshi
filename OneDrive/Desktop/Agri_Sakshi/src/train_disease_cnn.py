# train_disease_cnn.py
import os
import json
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# --------------------- CONFIG ---------------------
# Must match the class order in your React code
CLASS_NAMES = [
    "Late Blight",
    "Powdery Mildew",
    "Leaf Rust",
    "Bacterial Blight",
    "Leaf Spot",
]

DATA_DIR = "dataset"           # root containing train/ and val/
IMG_SIZE = (224, 224)          # MobileNetV2-friendly
BATCH_SIZE = 32
EPOCHS = 15                    # increase if you have more data
LEARNING_RATE = 1e-4
SAVE_DIR = "saved_plant_cnn"   # Keras SavedModel directory
SEED = 42
# --------------------------------------------------

# Fix GPU memory growth (optional)
gpus = tf.config.experimental.list_physical_devices("GPU")
for gpu in gpus:
    try:
        tf.config.experimental.set_memory_growth(gpu, True)
    except:
        pass

# 1) Load datasets (explicit class_names to lock label order)
train_ds = tf.keras.preprocessing.image_dataset_from_directory(
    os.path.join(DATA_DIR, "train"),
    labels="inferred",
    label_mode="categorical",
    class_names=CLASS_NAMES,         # <- fixes class index order!
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    seed=SEED,
)

val_ds = tf.keras.preprocessing.image_dataset_from_directory(
    os.path.join(DATA_DIR, "val"),
    labels="inferred",
    label_mode="categorical",
    class_names=CLASS_NAMES,         # <- fixes class index order!
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

# 2) Caching + prefetch for speed
AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.cache().shuffle(1024).prefetch(AUTOTUNE)
val_ds = val_ds.cache().prefetch(AUTOTUNE)

# 3) Data augmentation
data_augmentation = keras.Sequential(
    [
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.05),
        layers.RandomZoom(0.1),
        layers.RandomContrast(0.1),
    ],
    name="augmentation",
)

# Replace steps 4–5 with this block

inputs = keras.Input(shape=IMG_SIZE + (3,))
x = data_augmentation(inputs)
x = layers.Rescaling(1./255)(x)

def conv_block(x, f):
    x = layers.Conv2D(f, 3, padding="same", activation="relu")(x)
    x = layers.Conv2D(f, 3, padding="same", activation="relu")(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.2)(x)
    return x

x = conv_block(x, 32)
x = conv_block(x, 64)
x = conv_block(x, 128)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(len(CLASS_NAMES), activation="softmax")(x)

model = keras.Model(inputs, outputs, name="plant_disease_cnn_scratch")
model.compile(
    optimizer=keras.optimizers.Adam(1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)


# 6) Train (head-only)
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
)

# 7) Optionally fine-tune deeper layers (unfreeze tail)
# Uncomment to squeeze extra accuracy if you have enough data/compute
# base.trainable = True
# for layer in base.layers[:-40]:
#     layer.trainable = False
# model.compile(
#     optimizer=keras.optimizers.Adam(1e-5),
#     loss="categorical_crossentropy",
#     metrics=["accuracy"],
# )
# model.fit(train_ds, validation_data=val_ds, epochs=5)

# 8) Evaluate
eval_res = model.evaluate(val_ds)
print("Validation metrics:", eval_res)

# 9) Save Keras model (SavedModel)
model.save(SAVE_DIR, include_optimizer=False)
print("Saved Keras model to:", SAVE_DIR)

# 10) Save class names mapping (so frontend knows exact order)
with open(os.path.join(SAVE_DIR, "class_names.json"), "w") as f:
    json.dump(CLASS_NAMES, f, indent=2)
print("Saved class_names.json")
