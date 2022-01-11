import user from "../interface/user";
export class PrivateUser implements user {
  qq: number;
  constructor(qq: number) {
    this.qq = qq;
  }
}
