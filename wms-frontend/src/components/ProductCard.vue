<template>
  <div class="product-card">
    <img :src="image" alt="Product Image" class="product-image" />
    <div class="product-info">
      <h3 class="product-name">{{ name }}</h3>
      <p class="product-code">Code: {{ code }}</p>
      <p class="product-price">Price: {{ price.toLocaleString() }} VND</p>
      <p class="product-stock" :class="{ 'low-stock': stock < 10 }">
        Stock: {{ stock }}
      </p>
    </div>
    <div class="product-actions">
      <button @click="$emit('add-to-cart')">Add to cart</button>
      <button @click="$emit('view-detail')">Details</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProductCard',
  props: {
    image: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true }
  }
}
</script>

<style scoped>
.product-card {
  width: 260px;
  border: 1px solid #eee;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1em;
  transition: box-shadow 0.2s;
}
.product-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.product-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1em;
}
.product-info {
  text-align: center;
  margin-bottom: 1em;
}
.product-name {
  font-size: 1.2em;
  font-weight: 600;
  margin: 0.2em 0;
}
.product-code {
  color: #888;
  font-size: 0.95em;
  margin: 0.1em 0;
}
.product-price {
  color: #1976d2;
  font-weight: 500;
  margin: 0.2em 0;
}
.product-stock {
  color: #388e3c;
  font-size: 0.98em;
}
.product-stock.low-stock {
  color: #d32f2f;
  font-weight: bold;
}
.product-actions {
  display: flex;
  gap: 0.5em;
}
.product-actions button {
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5em 1em;
  cursor: pointer;
  font-size: 1em;
  transition: background 0.2s;
}
.product-actions button:hover {
  background: #1565c0;
}
</style>
