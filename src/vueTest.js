const app = new Vue({
  el: '#my-app',
  components: {
    'my-component': httpVueLoader('my-component.vue')
  }
});