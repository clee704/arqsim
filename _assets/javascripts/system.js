function System(a, p, node1, node2) {
  this.a = a;  // ratio of propagation delay relative to transmission time
  this.p = p;  // frame error rate
  this.node1 = node1;
  this.node2 = node2;
  this.link1 = new Link(a, p);
  this.link2 = new Link(a, p);
  this.node1.setLinks(this.link1, this.link2);
  this.node2.setLinks(this.link2, this.link1);
  this.clock = null;
}

System.prototype.setClock = function (clock) {
  this.link1.setClock(clock);
  this.link2.setClock(clock);
  this.node1.setClock(clock);
  this.node2.setClock(clock);
  this.clock = clock;
};
