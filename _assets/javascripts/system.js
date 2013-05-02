function System(params, NodeClass, clock) {
  // params.a = ratio of propagation delay relative to transmission time
  // params.p = block error rate
  this.params = params;
  this.link1 = new Link(params, clock);
  this.link2 = new Link(params, clock);
  this.node1 = new NodeClass(params, clock, this.link1, this.link2);
  this.node2 = new NodeClass(params, clock, this.link2, this.link1);
  this.clock = clock;
}
