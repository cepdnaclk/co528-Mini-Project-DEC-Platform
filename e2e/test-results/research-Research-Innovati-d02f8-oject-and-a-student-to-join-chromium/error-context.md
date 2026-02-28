# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - img [ref=e6]
    - generic [ref=e8]: DECP
  - heading "Welcome back" [level=1] [ref=e9]
  - paragraph [ref=e10]: Sign in to your DECP account
  - generic [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]: Email address
      - textbox "you@example.com" [ref=e14]
    - generic [ref=e15]:
      - generic [ref=e16]: Password
      - generic [ref=e17]:
        - textbox "••••••••" [ref=e18]
        - button [ref=e19]:
          - img [ref=e20]
    - button "Sign In" [ref=e23]
  - paragraph [ref=e24]:
    - text: Don't have an account?
    - link "Sign up" [ref=e25] [cursor=pointer]:
      - /url: /register
```