-- 011_sync_dsa_practice_with_website.sql
--
-- DSA parity (mobile app = website): frontend/src/pages/student/DSACoding.jsx
-- carries a hardcoded 40-problem bank (PROBLEMS + LEETCODE_SPECS) with its own
-- starter snippets, while the mobile app reads dsa_problems from the backend
-- (migration 008 seeded only 13 problems with different, abbreviated
-- starters). Students therefore saw different problems AND different code
-- snippets on phone vs website.
--
-- This forward-only, idempotent migration makes the database catalogue match
-- the website bank exactly: same titles, descriptions, examples, constraints,
-- hints, typed test cases and starter_code snippets (all languages the
-- website offers; the function runner itself remains Python/JavaScript, as
-- on the website). Existing rows matched by (normalised) title are upgraded
-- in place so UUIDs and submission history are preserved.
--
-- NOTE: the website's "starter" snippets currently contain complete worked
-- solutions. They are copied verbatim here so app and website stay identical;
-- if the website bank is ever changed to blank templates, re-run the
-- generator and ship a new migration rather than editing this one.
-- Apply AFTER 010_add_expo_push_receipt_jobs.sql.

ALTER TABLE public.dsa_problems ADD COLUMN IF NOT EXISTS hints jsonb DEFAULT '[]'::jsonb;

-- Canonicalise the two titles whose 008 wording differs from the website so
-- the seed below upgrades those rows instead of creating near-duplicates.
UPDATE public.dsa_problems SET title = 'Lowest Common Ancestor of BST'
WHERE title = 'Lowest Common Ancestor of a Binary Search Tree'
  AND NOT EXISTS (SELECT 1 FROM public.dsa_problems WHERE title = 'Lowest Common Ancestor of BST');
-- 'House Robber' was a 008-only addition with no website equivalent. Remove
-- it only when no student submission references it (otherwise it is kept and
-- simply remains an extra, history-preserving row).
DELETE FROM public.dsa_problems
WHERE title = 'House Robber'
  AND NOT EXISTS (SELECT 1 FROM public.dsa_submissions WHERE problem_id = public.dsa_problems.id);

WITH seed(title, description, difficulty, tags, examples, constraints, hints, test_cases, starter_code) AS (
  VALUES
  (
    $seed$Two Sum$seed$,
    $seed$Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to target. Assume exactly one solution. Cannot use same element twice.$seed$,
    $seed$Easy$seed$,
    $json$["Array","Hash Map"]$json$::jsonb,
    $json$[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]","explanation":"nums[0] + nums[1] = 2 + 7 = 9"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]"}]$json$::jsonb,
    $json$["2 ≤ nums.length ≤ 10⁴","-10⁹ ≤ nums[i] ≤ 10⁹","Exactly one solution exists"]$json$::jsonb,
    $json$["Try using a hash map to store complements","For each number x, check if target-x exists in the map","O(n) time, O(n) space is optimal"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"twoSum","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[2,7,11,15],9],"expected":[0,1]},{"args":[[3,2,4],6],"expected":[1,2]}]}$json$::jsonb,
    $json${"python":"def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []","javascript":"function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) return [map.get(complement), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}","java":"import java.util.*;\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer,Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}","cpp":"#include<bits/stdc++.h>\nusing namespace std;\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int,int> m;\n    for (int i = 0; i < nums.size(); i++) {\n        int c = target - nums[i];\n        if (m.count(c)) return {m[c], i};\n        m[nums[i]] = i;\n    }\n    return {};\n}","c":"#include<stdio.h>\nvoid twoSum(int* nums, int n, int target, int* r) {\n    for(int i=0;i<n;i++) for(int j=i+1;j<n;j++)\n        if(nums[i]+nums[j]==target){r[0]=i;r[1]=j;return;}\n}"}$json$::jsonb
  ),
  (
    $seed$Best Time to Buy and Sell Stock$seed$,
    $seed$Given an array `prices` where `prices[i]` is the price on day i. Choose one day to buy and one later day to sell. Return maximum profit. Return 0 if no profit.$seed$,
    $seed$Easy$seed$,
    $json$["Array","Greedy"]$json$::jsonb,
    $json$[{"input":"prices = [7,1,5,3,6,4]","output":"5","explanation":"Buy day 2 (price=1), sell day 5 (price=6). Profit = 5."},{"input":"prices = [7,6,4,3,1]","output":"0","explanation":"No profit possible."}]$json$::jsonb,
    $json$["1 ≤ prices.length ≤ 10⁵","0 ≤ prices[i] ≤ 10⁴"]$json$::jsonb,
    $json$["Track the minimum price seen so far","At each step compute profit = price - min_price","Update max profit accordingly"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"maxProfit","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[7,1,5,3,6,4]],"expected":5},{"args":[[7,6,4,3,1]],"expected":0}]}$json$::jsonb,
    $json${"python":"def maxProfit(prices):\n    min_price = float(\"inf\")\n    max_profit = 0\n    for price in prices:\n        min_price = min(min_price, price)\n        max_profit = max(max_profit, price - min_price)\n    return max_profit","javascript":"function maxProfit(prices) {\n    let minPrice = Infinity, maxProfit = 0;\n    for (const p of prices) {\n        minPrice = Math.min(minPrice, p);\n        maxProfit = Math.max(maxProfit, p - minPrice);\n    }\n    return maxProfit;\n}","java":"class Solution {\n    public int maxProfit(int[] prices) {\n        int min = Integer.MAX_VALUE, max = 0;\n        for (int p : prices) {\n            min = Math.min(min, p);\n            max = Math.max(max, p - min);\n        }\n        return max;\n    }\n}","cpp":"int maxProfit(vector<int>& p) {\n    int mn=INT_MAX, mx=0;\n    for(int x:p){mn=min(mn,x);mx=max(mx,x-mn);}\n    return mx;\n}","c":"int maxProfit(int* p, int n){int mn=p[0],mx=0;for(int i=1;i<n;i++){if(p[i]<mn)mn=p[i];else if(p[i]-mn>mx)mx=p[i]-mn;}return mx;}"}$json$::jsonb
  ),
  (
    $seed$Maximum Subarray (Kadane)$seed$,
    $seed$Given an integer array `nums`, find the subarray with the largest sum and return its sum.$seed$,
    $seed$Medium$seed$,
    $json$["Array","DP"]$json$::jsonb,
    $json$[{"input":"nums = [-2,1,-3,4,-1,2,1,-5,4]","output":"6","explanation":"Subarray [4,-1,2,1] has sum 6."},{"input":"nums = [1]","output":"1"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 10⁵","-10⁴ ≤ nums[i] ≤ 10⁴"]$json$::jsonb,
    $json$["Kadane's: at each position, decide to extend or start new","curr = max(nums[i], curr + nums[i])"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"maxSubArray","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[-2,1,-3,4,-1,2,1,-5,4]],"expected":6},{"args":[[1]],"expected":1}]}$json$::jsonb,
    $json${"python":"def maxSubArray(nums):\n    curr = best = nums[0]\n    for n in nums[1:]:\n        curr = max(n, curr + n)\n        best = max(best, curr)\n    return best","javascript":"function maxSubArray(nums) {\n    let curr = nums[0], best = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        curr = Math.max(nums[i], curr + nums[i]);\n        best = Math.max(best, curr);\n    }\n    return best;\n}","java":"class Solution{\n    public int maxSubArray(int[] a){\n        int curr=a[0],best=a[0];\n        for(int i=1;i<a.length;i++){curr=Math.max(a[i],curr+a[i]);best=Math.max(best,curr);}\n        return best;\n    }\n}","cpp":"int maxSubArray(vector<int>& a){\n    int curr=a[0],best=a[0];\n    for(int i=1;i<a.size();i++){curr=max(a[i],curr+a[i]);best=max(best,curr);}\n    return best;\n}","c":"int maxSubArray(int* a,int n){int c=a[0],b=a[0];for(int i=1;i<n;i++){c=c+a[i]>a[i]?c+a[i]:a[i];b=b>c?b:c;}return b;}"}$json$::jsonb
  ),
  (
    $seed$Container With Most Water$seed$,
    $seed$Given n vertical lines at positions 0..n-1 with heights `height[i]`. Find two lines that form a container holding the most water.$seed$,
    $seed$Medium$seed$,
    $json$["Array","Two Pointers"]$json$::jsonb,
    $json$[{"input":"height = [1,8,6,2,5,4,8,3,7]","output":"49"},{"input":"height = [1,1]","output":"1"}]$json$::jsonb,
    $json$["2 ≤ height.length ≤ 10⁵","0 ≤ height[i] ≤ 10⁴"]$json$::jsonb,
    $json$["Use two pointers starting at both ends","Move the pointer with smaller height inward","Area = min(h[l],h[r]) * (r-l)"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"maxArea","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,8,6,2,5,4,8,3,7]],"expected":49},{"args":[[1,1]],"expected":1}]}$json$::jsonb,
    $json${"python":"def maxArea(height):\n    l, r = 0, len(height) - 1\n    best = 0\n    while l < r:\n        best = max(best, min(height[l], height[r]) * (r - l))\n        if height[l] < height[r]: l += 1\n        else: r -= 1\n    return best","javascript":"function maxArea(h) {\n    let l=0, r=h.length-1, best=0;\n    while(l<r){\n        best=Math.max(best,Math.min(h[l],h[r])*(r-l));\n        if(h[l]<h[r])l++; else r--;\n    }\n    return best;\n}","java":"class Solution{\n    public int maxArea(int[] h){\n        int l=0,r=h.length-1,best=0;\n        while(l<r){best=Math.max(best,Math.min(h[l],h[r])*(r-l));if(h[l]<h[r])l++;else r--;}\n        return best;\n    }\n}","cpp":"int maxArea(vector<int>& h){\n    int l=0,r=h.size()-1,best=0;\n    while(l<r){best=max(best,min(h[l],h[r])*(r-l));if(h[l]<h[r])l++;else r--;}\n    return best;\n}","c":"int maxArea(int* h,int n){int l=0,r=n-1,b=0;while(l<r){int a=(h[l]<h[r]?h[l]:h[r])*(r-l);if(a>b)b=a;if(h[l]<h[r])l++;else r--;}return b;}"}$json$::jsonb
  ),
  (
    $seed$Trapping Rain Water$seed$,
    $seed$Given `height` array representing elevation map, compute how much water it can trap after raining.$seed$,
    $seed$Hard$seed$,
    $json$["Array","Two Pointers","Stack"]$json$::jsonb,
    $json$[{"input":"height = [0,1,0,2,1,0,1,3,2,1,2,1]","output":"6"},{"input":"height = [4,2,0,3,2,5]","output":"9"}]$json$::jsonb,
    $json$["1 ≤ height.length ≤ 2×10⁴","0 ≤ height[i] ≤ 10⁵"]$json$::jsonb,
    $json$["Two pointer approach: track maxLeft and maxRight","Water at i = min(maxL, maxR) - height[i]","Move the side with smaller max inward"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"trap","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[0,1,0,2,1,0,1,3,2,1,2,1]],"expected":6},{"args":[[4,2,0,3,2,5]],"expected":9}]}$json$::jsonb,
    $json${"python":"def trap(height):\n    l, r = 0, len(height)-1\n    maxL = maxR = water = 0\n    while l < r:\n        if height[l] <= height[r]:\n            if height[l] >= maxL: maxL = height[l]\n            else: water += maxL - height[l]\n            l += 1\n        else:\n            if height[r] >= maxR: maxR = height[r]\n            else: water += maxR - height[r]\n            r -= 1\n    return water","javascript":"function trap(h){\n    let l=0,r=h.length-1,mL=0,mR=0,w=0;\n    while(l<r){\n        if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}\n        else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}\n    }\n    return w;\n}","java":"class Solution{public int trap(int[] h){int l=0,r=h.length-1,mL=0,mR=0,w=0;while(l<r){if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}}return w;}}","cpp":"int trap(vector<int>&h){int l=0,r=h.size()-1,mL=0,mR=0,w=0;while(l<r){if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}}return w;}","c":"int trap(int*h,int n){int l=0,r=n-1,mL=0,mR=0,w=0;while(l<r){if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}}return w;}"}$json$::jsonb
  ),
  (
    $seed$3Sum$seed$,
    $seed$Given integer array nums, return all triplets [nums[i], nums[j], nums[k]] such that i≠j≠k and nums[i]+nums[j]+nums[k]==0. No duplicate triplets.$seed$,
    $seed$Medium$seed$,
    $json$["Array","Two Pointers","Sorting"]$json$::jsonb,
    $json$[{"input":"nums = [-1,0,1,2,-1,-4]","output":"[[-1,-1,2],[-1,0,1]]"}]$json$::jsonb,
    $json$["3 ≤ nums.length ≤ 3000","-10⁵ ≤ nums[i] ≤ 10⁵"]$json$::jsonb,
    $json$["Sort first, then use two pointers for each i","Skip duplicates carefully","Fix nums[i], find pair summing to -nums[i]"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"threeSum","compare":"deep-unordered","languages":["python","javascript"]},"cases":[{"args":[[-1,0,1,2,-1,-4]],"expected":[[-1,-1,2],[-1,0,1]]}]}$json$::jsonb,
    $json${"python":"def threeSum(nums):\n    nums.sort()\n    res = []\n    for i in range(len(nums)-2):\n        if i > 0 and nums[i] == nums[i-1]: continue\n        l, r = i+1, len(nums)-1\n        while l < r:\n            s = nums[i]+nums[l]+nums[r]\n            if s == 0:\n                res.append([nums[i],nums[l],nums[r]])\n                while l<r and nums[l]==nums[l+1]: l+=1\n                while l<r and nums[r]==nums[r-1]: r-=1\n                l+=1; r-=1\n            elif s < 0: l+=1\n            else: r-=1\n    return res","javascript":"function threeSum(nums){\n    nums.sort((a,b)=>a-b); const res=[];\n    for(let i=0;i<nums.length-2;i++){\n        if(i>0&&nums[i]===nums[i-1])continue;\n        let l=i+1,r=nums.length-1;\n        while(l<r){\n            const s=nums[i]+nums[l]+nums[r];\n            if(s===0){res.push([nums[i],nums[l],nums[r]]);while(l<r&&nums[l]===nums[l+1])l++;while(l<r&&nums[r]===nums[r-1])r--;l++;r--;}\n            else if(s<0)l++; else r--;\n        }\n    }\n    return res;\n}","java":"class Solution{public List<List<Integer>> threeSum(int[] n){Arrays.sort(n);List<List<Integer>> r=new ArrayList<>();for(int i=0;i<n.length-2;i++){if(i>0&&n[i]==n[i-1])continue;int l=i+1,ri=n.length-1;while(l<ri){int s=n[i]+n[l]+n[ri];if(s==0){r.add(Arrays.asList(n[i],n[l],n[ri]));while(l<ri&&n[l]==n[l+1])l++;while(l<ri&&n[ri]==n[ri-1])ri--;l++;ri--;}else if(s<0)l++;else ri--;}}return r;}}","cpp":"vector<vector<int>> threeSum(vector<int>& n){sort(n.begin(),n.end());vector<vector<int>> r;for(int i=0;i<(int)n.size()-2;i++){if(i>0&&n[i]==n[i-1])continue;int l=i+1,ri=n.size()-1;while(l<ri){int s=n[i]+n[l]+n[ri];if(s==0){r.push_back({n[i],n[l],n[ri]});while(l<ri&&n[l]==n[l+1])l++;while(l<ri&&n[ri]==n[ri-1])ri--;l++;ri--;}else if(s<0)l++;else ri--;}}return r;}","c":"/* C solution omitted for brevity - implement with nested loops */"}$json$::jsonb
  ),
  (
    $seed$Valid Palindrome$seed$,
    $seed$Given string s, return true if it is a palindrome considering only alphanumeric characters and ignoring cases.$seed$,
    $seed$Easy$seed$,
    $json$["String","Two Pointers"]$json$::jsonb,
    $json$[{"input":"s = \"A man, a plan, a canal: Panama\"","output":"true"},{"input":"s = \"race a car\"","output":"false"}]$json$::jsonb,
    $json$["1 ≤ s.length ≤ 2×10⁵","s consists only of printable ASCII"]$json$::jsonb,
    $json$["Use two pointers from each end","Skip non-alphanumeric characters","Compare lowercase versions"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"isPalindrome","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["A man, a plan, a canal: Panama"],"expected":true},{"args":["race a car"],"expected":false}]}$json$::jsonb,
    $json${"python":"def isPalindrome(s):\n    l, r = 0, len(s)-1\n    while l < r:\n        while l < r and not s[l].isalnum(): l += 1\n        while l < r and not s[r].isalnum(): r -= 1\n        if s[l].lower() != s[r].lower(): return False\n        l += 1; r -= 1\n    return True","javascript":"function isPalindrome(s){\n    s=s.toLowerCase().replace(/[^a-z0-9]/g,\"\");\n    let l=0,r=s.length-1;\n    while(l<r){if(s[l]!==s[r])return false;l++;r--;}\n    return true;\n}","java":"class Solution{public boolean isPalindrome(String s){s=s.toLowerCase().replaceAll(\"[^a-z0-9]\",\"\");int l=0,r=s.length()-1;while(l<r){if(s.charAt(l)!=s.charAt(r))return false;l++;r--;}return true;}}","cpp":"bool isPalindrome(string s){string t;for(char c:s)if(isalnum(c))t+=tolower(c);int l=0,r=t.size()-1;while(l<r){if(t[l]!=t[r])return false;l++;r--;}return true;}","c":"#include<ctype.h>\nint isPalindrome(char* s){int l=0,r=strlen(s)-1;while(l<r){while(l<r&&!isalnum(s[l]))l++;while(l<r&&!isalnum(s[r]))r--;if(tolower(s[l])!=tolower(s[r]))return 0;l++;r--;}return 1;}"}$json$::jsonb
  ),
  (
    $seed$Longest Substring Without Repeating Characters$seed$,
    $seed$Given string s, find the length of the longest substring without repeating characters.$seed$,
    $seed$Medium$seed$,
    $json$["String","Sliding Window","Hash Map"]$json$::jsonb,
    $json$[{"input":"s = \"abcabcbb\"","output":"3","explanation":"\"abc\" has length 3"},{"input":"s = \"bbbbb\"","output":"1"}]$json$::jsonb,
    $json$["0 ≤ s.length ≤ 5×10⁴"]$json$::jsonb,
    $json$["Sliding window with a hash map","When duplicate found, move left pointer past previous occurrence","Window size = r - l + 1"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"lengthOfLongestSubstring","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["abcabcbb"],"expected":3},{"args":["bbbbb"],"expected":1},{"args":["pwwkew"],"expected":3}]}$json$::jsonb,
    $json${"python":"def lengthOfLongestSubstring(s):\n    seen = {}\n    l = best = 0\n    for r, c in enumerate(s):\n        if c in seen and seen[c] >= l:\n            l = seen[c] + 1\n        seen[c] = r\n        best = max(best, r - l + 1)\n    return best","javascript":"function lengthOfLongestSubstring(s){\n    const m=new Map();let l=0,best=0;\n    for(let r=0;r<s.length;r++){\n        if(m.has(s[r])&&m.get(s[r])>=l)l=m.get(s[r])+1;\n        m.set(s[r],r);\n        best=Math.max(best,r-l+1);\n    }\n    return best;\n}","java":"class Solution{public int lengthOfLongestSubstring(String s){Map<Character,Integer> m=new HashMap<>();int l=0,best=0;for(int r=0;r<s.length();r++){char c=s.charAt(r);if(m.containsKey(c)&&m.get(c)>=l)l=m.get(c)+1;m.put(c,r);best=Math.max(best,r-l+1);}return best;}}","cpp":"int lengthOfLongestSubstring(string s){unordered_map<char,int> m;int l=0,best=0;for(int r=0;r<s.size();r++){if(m.count(s[r])&&m[s[r]]>=l)l=m[s[r]]+1;m[s[r]]=r;best=max(best,r-l+1);}return best;}","c":"int lengthOfLongestSubstring(char* s){int m[256];memset(m,-1,sizeof(m));int l=0,best=0,n=strlen(s);for(int r=0;r<n;r++){if(m[(int)s[r]]>=l)l=m[(int)s[r]]+1;m[(int)s[r]]=r;if(r-l+1>best)best=r-l+1;}return best;}"}$json$::jsonb
  ),
  (
    $seed$Valid Anagram$seed$,
    $seed$Given two strings s and t, return true if t is an anagram of s, and false otherwise.$seed$,
    $seed$Easy$seed$,
    $json$["String","Hash Map","Sorting"]$json$::jsonb,
    $json$[{"input":"s = \"anagram\", t = \"nagaram\"","output":"true"},{"input":"s = \"rat\", t = \"car\"","output":"false"}]$json$::jsonb,
    $json$["1 ≤ s.length, t.length ≤ 5×10⁴","s and t consist of lowercase English letters"]$json$::jsonb,
    $json$["Count character frequencies","Compare frequency maps","Or sort both strings and compare"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"isAnagram","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["anagram","nagaram"],"expected":true},{"args":["rat","car"],"expected":false}]}$json$::jsonb,
    $json${"python":"def isAnagram(s, t):\n    if len(s) != len(t): return False\n    from collections import Counter\n    return Counter(s) == Counter(t)","javascript":"function isAnagram(s,t){\n    if(s.length!==t.length)return false;\n    const c={};\n    for(const x of s)c[x]=(c[x]||0)+1;\n    for(const x of t){if(!c[x])return false;c[x]--;}\n    return true;\n}","java":"class Solution{public boolean isAnagram(String s,String t){if(s.length()!=t.length())return false;int[]c=new int[26];for(char x:s.toCharArray())c[x-'a']++;for(char x:t.toCharArray())if(--c[x-'a']<0)return false;return true;}}","cpp":"bool isAnagram(string s,string t){if(s.size()!=t.size())return false;int c[26]={};for(char x:s)c[x-'a']++;for(char x:t)if(--c[x-'a']<0)return false;return true;}","c":"int isAnagram(char*s,char*t){if(strlen(s)!=strlen(t))return 0;int c[26]={};while(*s)c[*s++-'a']++;while(*t)if(--c[*t++-'a']<0)return 0;return 1;}"}$json$::jsonb
  ),
  (
    $seed$Longest Palindromic Substring$seed$,
    $seed$Given a string s, return the longest palindromic substring in s.$seed$,
    $seed$Medium$seed$,
    $json$["String","DP","Two Pointers"]$json$::jsonb,
    $json$[{"input":"s = \"babad\"","output":"\"bab\"","explanation":"\"aba\" is also valid"},{"input":"s = \"cbbd\"","output":"\"bb\""}]$json$::jsonb,
    $json$["1 ≤ s.length ≤ 1000"]$json$::jsonb,
    $json$["Expand around center for each character","Try both odd and even length palindromes","O(n²) with O(1) space using expand-around-center"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"longestPalindrome","compare":"one-of","languages":["python","javascript"]},"cases":[{"args":["babad"],"expected":["bab","aba"]},{"args":["cbbd"],"expected":["bb"]}]}$json$::jsonb,
    $json${"python":"def longestPalindrome(s):\n    def expand(l, r):\n        while l>=0 and r<len(s) and s[l]==s[r]: l-=1; r+=1\n        return s[l+1:r]\n    best = \"\"\n    for i in range(len(s)):\n        for p in [expand(i,i), expand(i,i+1)]:\n            if len(p) > len(best): best = p\n    return best","javascript":"function longestPalindrome(s){\n    let best=\"\";\n    function expand(l,r){\n        while(l>=0&&r<s.length&&s[l]===s[r]){l--;r++;}\n        return s.slice(l+1,r);\n    }\n    for(let i=0;i<s.length;i++){\n        for(const p of[expand(i,i),expand(i,i+1)])if(p.length>best.length)best=p;\n    }\n    return best;\n}","java":"class Solution{public String longestPalindrome(String s){String best=\"\";for(int i=0;i<s.length();i++){for(int d:new int[]{0,1}){int l=i,r=i+d;while(l>=0&&r<s.length()&&s.charAt(l)==s.charAt(r)){l--;r++;}String p=s.substring(l+1,r);if(p.length()>best.length())best=p;}}return best;}}","cpp":"string longestPalindrome(string s){string best;for(int i=0;i<s.size();i++){for(int d:{0,1}){int l=i,r=i+d;while(l>=0&&r<(int)s.size()&&s[l]==s[r]){l--;r++;}if(r-l-1>best.size())best=s.substr(l+1,r-l-1);}}return best;}","c":"char res[1001];char* longestPalindrome(char*s){int n=strlen(s),bs=0,bi=0;for(int i=0;i<n;i++){for(int d=0;d<=1;d++){int l=i,r=i+d;while(l>=0&&r<n&&s[l]==s[r]){l--;r++;}if(r-l-1>bs){bs=r-l-1;bi=l+1;}}}strncpy(res,s+bi,bs);res[bs]=0;return res;}"}$json$::jsonb
  ),
  (
    $seed$Group Anagrams$seed$,
    $seed$Given an array of strings strs, group the anagrams together. Return the answer in any order.$seed$,
    $seed$Medium$seed$,
    $json$["String","Hash Map","Sorting"]$json$::jsonb,
    $json$[{"input":"strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]","output":"[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"}]$json$::jsonb,
    $json$["1 ≤ strs.length ≤ 10⁴"]$json$::jsonb,
    $json$["Sort each string as the key","Use a hash map from sorted_key → group"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"groupAnagrams","compare":"deep-unordered","languages":["python","javascript"]},"cases":[{"args":[["eat","tea","tan","ate","nat","bat"]],"expected":[["eat","tea","ate"],["tan","nat"],["bat"]]}]}$json$::jsonb,
    $json${"python":"def groupAnagrams(strs):\n    from collections import defaultdict\n    d = defaultdict(list)\n    for s in strs:\n        d[tuple(sorted(s))].append(s)\n    return list(d.values())","javascript":"function groupAnagrams(strs){\n    const m=new Map();\n    for(const s of strs){\n        const k=s.split(\"\").sort().join(\"\");\n        if(!m.has(k))m.set(k,[]);\n        m.get(k).push(s);\n    }\n    return [...m.values()];\n}","java":"class Solution{public List<List<String>> groupAnagrams(String[] s){Map<String,List<String>> m=new HashMap<>();for(String x:s){char[]c=x.toCharArray();Arrays.sort(c);String k=new String(c);m.computeIfAbsent(k,z->new ArrayList<>()).add(x);}return new ArrayList<>(m.values());}}","cpp":"vector<vector<string>> groupAnagrams(vector<string>&s){unordered_map<string,vector<string>> m;for(auto&x:s){string k=x;sort(k.begin(),k.end());m[k].push_back(x);}vector<vector<string>> r;for(auto&p:m)r.push_back(p.second);return r;}","c":"/* Group anagrams in C - sort each string and use as key */"}$json$::jsonb
  ),
  (
    $seed$Reverse Linked List$seed$,
    $seed$Given the head of a singly linked list, reverse the list and return the reversed head.$seed$,
    $seed$Easy$seed$,
    $json$["Linked List","Recursion"]$json$::jsonb,
    $json$[{"input":"head = [1,2,3,4,5]","output":"[5,4,3,2,1]"},{"input":"head = [1,2]","output":"[2,1]"}]$json$::jsonb,
    $json$["0 ≤ length ≤ 5000","-5000 ≤ Node.val ≤ 5000"]$json$::jsonb,
    $json$["Iterative: use prev, curr, next pointers","Recursive: reverse(head.next) then relink head"]$json$::jsonb,
    $json${"execution":{"kind":"linked-list","method":"reverseList","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,2,3,4,5]],"expected":[5,4,3,2,1]},{"args":[[1,2]],"expected":[2,1]}]}$json$::jsonb,
    $json${"python":"class ListNode:\n    def __init__(self,val=0,next=None): self.val=val;self.next=next\n\ndef reverseList(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev","javascript":"function reverseList(head){\n    let prev=null, curr=head;\n    while(curr){\n        const nxt=curr.next;\n        curr.next=prev;\n        prev=curr;\n        curr=nxt;\n    }\n    return prev;\n}","java":"class Solution{public ListNode reverseList(ListNode head){ListNode prev=null,curr=head;while(curr!=null){ListNode nxt=curr.next;curr.next=prev;prev=curr;curr=nxt;}return prev;}}","cpp":"ListNode* reverseList(ListNode* head){ListNode* prev=nullptr;while(head){ListNode* nxt=head->next;head->next=prev;prev=head;head=nxt;}return prev;}","c":"struct ListNode* reverseList(struct ListNode* h){struct ListNode* p=NULL;while(h){struct ListNode* n=h->next;h->next=p;p=h;h=n;}return p;}"}$json$::jsonb
  ),
  (
    $seed$Merge Two Sorted Lists$seed$,
    $seed$Given heads of two sorted linked lists list1 and list2, merge them into one sorted list and return the head.$seed$,
    $seed$Easy$seed$,
    $json$["Linked List","Recursion"]$json$::jsonb,
    $json$[{"input":"list1=[1,2,4], list2=[1,3,4]","output":"[1,1,2,3,4,4]"}]$json$::jsonb,
    $json$["0 ≤ length ≤ 50","-100 ≤ Node.val ≤ 100"]$json$::jsonb,
    $json$["Use a dummy head node","Iteratively compare and attach the smaller node"]$json$::jsonb,
    $json${"execution":{"kind":"merge-lists","method":"mergeTwoLists","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,2,4],[1,3,4]],"expected":[1,1,2,3,4,4]}]}$json$::jsonb,
    $json${"python":"def mergeTwoLists(l1, l2):\n    dummy = ListNode(0)\n    curr = dummy\n    while l1 and l2:\n        if l1.val <= l2.val: curr.next=l1; l1=l1.next\n        else: curr.next=l2; l2=l2.next\n        curr=curr.next\n    curr.next = l1 or l2\n    return dummy.next","javascript":"function mergeTwoLists(l1,l2){\n    const d={val:0,next:null};let c=d;\n    while(l1&&l2){\n        if(l1.val<=l2.val){c.next=l1;l1=l1.next;}else{c.next=l2;l2=l2.next;}\n        c=c.next;\n    }\n    c.next=l1||l2;\n    return d.next;\n}","java":"class Solution{public ListNode mergeTwoLists(ListNode l1,ListNode l2){ListNode d=new ListNode(0),c=d;while(l1!=null&&l2!=null){if(l1.val<=l2.val){c.next=l1;l1=l1.next;}else{c.next=l2;l2=l2.next;}c=c.next;}c.next=l1!=null?l1:l2;return d.next;}}","cpp":"ListNode* mergeTwoLists(ListNode*l1,ListNode*l2){ListNode d(0);ListNode*c=&d;while(l1&&l2){if(l1->val<=l2->val){c->next=l1;l1=l1->next;}else{c->next=l2;l2=l2->next;}c=c->next;}c->next=l1?l1:l2;return d.next;}","c":"struct ListNode* mergeTwoLists(struct ListNode*l1,struct ListNode*l2){struct ListNode d;struct ListNode*c=&d;while(l1&&l2){if(l1->val<=l2->val){c->next=l1;l1=l1->next;}else{c->next=l2;l2=l2->next;}c=c->next;}c->next=l1?l1:l2;return d.next;}"}$json$::jsonb
  ),
  (
    $seed$Linked List Cycle$seed$,
    $seed$Given head of a linked list, determine if the list has a cycle.$seed$,
    $seed$Easy$seed$,
    $json$["Linked List","Two Pointers"]$json$::jsonb,
    $json$[{"input":"head=[3,2,0,-4], pos=1 (cycle at index 1)","output":"true"}]$json$::jsonb,
    $json$["0 ≤ number of nodes ≤ 10⁴"]$json$::jsonb,
    $json$["Floyd's Cycle Detection: slow moves 1 step, fast moves 2","If they meet, there's a cycle"]$json$::jsonb,
    $json${"execution":{"kind":"cycle-list","method":"hasCycle","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[3,2,0,-4],1],"expected":true},{"args":[[1],-1],"expected":false}]}$json$::jsonb,
    $json${"python":"def hasCycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast: return True\n    return False","javascript":"function hasCycle(head){\n    let slow=head,fast=head;\n    while(fast&&fast.next){\n        slow=slow.next;fast=fast.next.next;\n        if(slow===fast)return true;\n    }\n    return false;\n}","java":"class Solution{public boolean hasCycle(ListNode h){ListNode s=h,f=h;while(f!=null&&f.next!=null){s=s.next;f=f.next.next;if(s==f)return true;}return false;}}","cpp":"bool hasCycle(ListNode*h){ListNode*s=h,*f=h;while(f&&f->next){s=s->next;f=f->next->next;if(s==f)return true;}return false;}","c":"int hasCycle(struct ListNode*h){struct ListNode*s=h,*f=h;while(f&&f->next){s=s->next;f=f->next->next;if(s==f)return 1;}return 0;}"}$json$::jsonb
  ),
  (
    $seed$LRU Cache$seed$,
    $seed$Design a data structure that follows LRU cache constraints. Implement LRUCache with get(key) and put(key, value) both in O(1).$seed$,
    $seed$Medium$seed$,
    $json$["Linked List","Hash Map","Design"]$json$::jsonb,
    $json$[{"input":"LRUCache(2); put(1,1); put(2,2); get(1)→1; put(3,3)[evicts 2]; get(2)→-1","output":"-1 for evicted key"}]$json$::jsonb,
    $json$["1 ≤ capacity ≤ 3000","0 ≤ key, value ≤ 10⁴"]$json$::jsonb,
    $json$["Use doubly linked list + hash map","Map: key → node; List: LRU order","On access: move node to front; On capacity: remove from back"]$json$::jsonb,
    $json${"execution":{"kind":"lru-cache","className":"LRUCache","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[2,[["put",1,1],["put",2,2],["get",1],["put",3,3],["get",2]]],"expected":[1,-1]}]}$json$::jsonb,
    $json${"python":"class LRUCache:\n    def __init__(self, capacity):\n        from collections import OrderedDict\n        self.cap = capacity\n        self.cache = OrderedDict()\n    \n    def get(self, key):\n        if key not in self.cache: return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    \n    def put(self, key, value):\n        if key in self.cache: self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)","javascript":"class LRUCache{\n    constructor(cap){this.cap=cap;this.m=new Map();}\n    get(k){if(!this.m.has(k))return -1;const v=this.m.get(k);this.m.delete(k);this.m.set(k,v);return v;}\n    put(k,v){if(this.m.has(k))this.m.delete(k);this.m.set(k,v);if(this.m.size>this.cap)this.m.delete(this.m.keys().next().value);}\n}","java":"class LRUCache extends LinkedHashMap<Integer,Integer>{int cap;LRUCache(int c){super(c,0.75f,true);cap=c;}public int get(int k){return super.getOrDefault(k,-1);}public void put(int k,int v){super.put(k,v);}protected boolean removeEldestEntry(Map.Entry<Integer,Integer> e){return size()>cap;}}","cpp":"class LRUCache{int cap;list<pair<int,int>> l;unordered_map<int,list<pair<int,int>>::iterator> m;public:LRUCache(int c):cap(c){}int get(int k){if(!m.count(k))return -1;l.splice(l.begin(),l,m[k]);return m[k]->second;}void put(int k,int v){if(m.count(k))l.erase(m[k]);else if(l.size()==cap){m.erase(l.back().first);l.pop_back();}l.push_front({k,v});m[k]=l.begin();}};","c":"/* LRU Cache in C - use array-based hash map + doubly linked list */"}$json$::jsonb
  ),
  (
    $seed$Maximum Depth of Binary Tree$seed$,
    $seed$Given the root of a binary tree, return its maximum depth (number of nodes along longest root-to-leaf path).$seed$,
    $seed$Easy$seed$,
    $json$["Tree","DFS","BFS"]$json$::jsonb,
    $json$[{"input":"root = [3,9,20,null,null,15,7]","output":"3"}]$json$::jsonb,
    $json$["0 ≤ nodes ≤ 10⁴","-100 ≤ Node.val ≤ 100"]$json$::jsonb,
    $json$["DFS: max(depth(left), depth(right)) + 1","BFS: count levels"]$json$::jsonb,
    $json${"execution":{"kind":"tree-call","method":"maxDepth","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[3,9,20,null,null,15,7]],"expected":3},{"args":[[1]],"expected":1}]}$json$::jsonb,
    $json${"python":"def maxDepth(root):\n    if not root: return 0\n    return 1 + max(maxDepth(root.left), maxDepth(root.right))","javascript":"function maxDepth(root){\n    if(!root)return 0;\n    return 1+Math.max(maxDepth(root.left),maxDepth(root.right));\n}","java":"class Solution{public int maxDepth(TreeNode r){return r==null?0:1+Math.max(maxDepth(r.left),maxDepth(r.right));}}","cpp":"int maxDepth(TreeNode*r){return r?1+max(maxDepth(r->left),maxDepth(r->right)):0;}","c":"int maxDepth(struct TreeNode*r){if(!r)return 0;int l=maxDepth(r->left),ri=maxDepth(r->right);return 1+(l>ri?l:ri);}"}$json$::jsonb
  ),
  (
    $seed$Invert Binary Tree$seed$,
    $seed$Given the root of a binary tree, invert the tree (mirror it), and return its root.$seed$,
    $seed$Easy$seed$,
    $json$["Tree","DFS","BFS"]$json$::jsonb,
    $json$[{"input":"root = [4,2,7,1,3,6,9]","output":"[4,7,2,9,6,3,1]"}]$json$::jsonb,
    $json$["0 ≤ nodes ≤ 100"]$json$::jsonb,
    $json$["Recursively swap left and right children","Apply to every node"]$json$::jsonb,
    $json${"execution":{"kind":"tree-result","method":"invertTree","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[4,2,7,1,3,6,9]],"expected":[4,7,2,9,6,3,1]}]}$json$::jsonb,
    $json${"python":"def invertTree(root):\n    if not root: return None\n    root.left, root.right = invertTree(root.right), invertTree(root.left)\n    return root","javascript":"function invertTree(root){\n    if(!root)return null;\n    [root.left,root.right]=[invertTree(root.right),invertTree(root.left)];\n    return root;\n}","java":"class Solution{public TreeNode invertTree(TreeNode r){if(r==null)return null;TreeNode tmp=r.left;r.left=invertTree(r.right);r.right=invertTree(tmp);return r;}}","cpp":"TreeNode* invertTree(TreeNode*r){if(!r)return nullptr;swap(r->left,r->right);invertTree(r->left);invertTree(r->right);return r;}","c":"struct TreeNode* invertTree(struct TreeNode*r){if(!r)return NULL;struct TreeNode*t=r->left;r->left=invertTree(r->right);r->right=invertTree(t);return r;}"}$json$::jsonb
  ),
  (
    $seed$Lowest Common Ancestor of BST$seed$,
    $seed$Given BST root and two nodes p and q, find their lowest common ancestor (LCA).$seed$,
    $seed$Easy$seed$,
    $json$["Tree","BST","DFS"]$json$::jsonb,
    $json$[{"input":"root=[6,2,8,0,4,7,9], p=2, q=8","output":"6"},{"input":"p=2, q=4","output":"2"}]$json$::jsonb,
    $json$["2 ≤ nodes ≤ 10⁵","BST properties hold"]$json$::jsonb,
    $json$["If both < root: go left; if both > root: go right; otherwise root is LCA"]$json$::jsonb,
    $json${"execution":{"kind":"tree-lca","method":"lowestCommonAncestor","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[6,2,8,0,4,7,9,null,null,3,5],2,8],"expected":6},{"args":[[6,2,8,0,4,7,9,null,null,3,5],2,4],"expected":2}]}$json$::jsonb,
    $json${"python":"def lowestCommonAncestor(root, p, q):\n    while root:\n        if p.val < root.val and q.val < root.val: root = root.left\n        elif p.val > root.val and q.val > root.val: root = root.right\n        else: return root","javascript":"function lowestCommonAncestor(root,p,q){\n    while(root){\n        if(p.val<root.val&&q.val<root.val)root=root.left;\n        else if(p.val>root.val&&q.val>root.val)root=root.right;\n        else return root;\n    }\n}","java":"class Solution{public TreeNode lowestCommonAncestor(TreeNode r,TreeNode p,TreeNode q){while(r!=null){if(p.val<r.val&&q.val<r.val)r=r.left;else if(p.val>r.val&&q.val>r.val)r=r.right;else return r;}return null;}}","cpp":"TreeNode* lowestCommonAncestor(TreeNode*r,TreeNode*p,TreeNode*q){while(r){if(p->val<r->val&&q->val<r->val)r=r->left;else if(p->val>r->val&&q->val>r->val)r=r->right;else return r;}return nullptr;}","c":"struct TreeNode* lowestCommonAncestor(struct TreeNode*r,struct TreeNode*p,struct TreeNode*q){while(r){if(p->val<r->val&&q->val<r->val)r=r->left;else if(p->val>r->val&&q->val>r->val)r=r->right;else return r;}return NULL;}"}$json$::jsonb
  ),
  (
    $seed$Binary Tree Level Order Traversal$seed$,
    $seed$Given root of a binary tree, return the level order traversal of its nodes (left to right, level by level).$seed$,
    $seed$Medium$seed$,
    $json$["Tree","BFS","Queue"]$json$::jsonb,
    $json$[{"input":"root = [3,9,20,null,null,15,7]","output":"[[3],[9,20],[15,7]]"}]$json$::jsonb,
    $json$["0 ≤ nodes ≤ 2000"]$json$::jsonb,
    $json$["Use a queue","Process all nodes at current level before moving to next"]$json$::jsonb,
    $json${"execution":{"kind":"tree-call","method":"levelOrder","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[3,9,20,null,null,15,7]],"expected":[[3],[9,20],[15,7]]}]}$json$::jsonb,
    $json${"python":"from collections import deque\ndef levelOrder(root):\n    if not root: return []\n    q, res = deque([root]), []\n    while q:\n        level = []\n        for _ in range(len(q)):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left: q.append(node.left)\n            if node.right: q.append(node.right)\n        res.append(level)\n    return res","javascript":"function levelOrder(root){\n    if(!root)return[];\n    const q=[root],res=[];\n    while(q.length){\n        const level=[];\n        for(let i=q.length;i>0;i--){\n            const n=q.shift();\n            level.push(n.val);\n            if(n.left)q.push(n.left);\n            if(n.right)q.push(n.right);\n        }\n        res.push(level);\n    }\n    return res;\n}","java":"class Solution{public List<List<Integer>> levelOrder(TreeNode root){List<List<Integer>> res=new ArrayList<>();if(root==null)return res;Queue<TreeNode> q=new LinkedList<>();q.add(root);while(!q.isEmpty()){int sz=q.size();List<Integer> lv=new ArrayList<>();for(int i=0;i<sz;i++){TreeNode n=q.poll();lv.add(n.val);if(n.left!=null)q.add(n.left);if(n.right!=null)q.add(n.right);}res.add(lv);}return res;}}","cpp":"vector<vector<int>> levelOrder(TreeNode*root){vector<vector<int>> res;if(!root)return res;queue<TreeNode*> q;q.push(root);while(!q.empty()){int sz=q.size();vector<int> lv;for(int i=0;i<sz;i++){TreeNode*n=q.front();q.pop();lv.push_back(n->val);if(n->left)q.push(n->left);if(n->right)q.push(n->right);}res.push_back(lv);}return res;}","c":"/* Level order using queue - implement with array-based queue */"}$json$::jsonb
  ),
  (
    $seed$Binary Tree Maximum Path Sum$seed$,
    $seed$A path in a binary tree connects any two nodes where each adjacent pair has an edge. Return the maximum path sum of any non-empty path.$seed$,
    $seed$Hard$seed$,
    $json$["Tree","DFS","DP"]$json$::jsonb,
    $json$[{"input":"root = [-10,9,20,null,null,15,7]","output":"42","explanation":"Path: 15→20→7"}]$json$::jsonb,
    $json$["-1000 ≤ Node.val ≤ 1000"]$json$::jsonb,
    $json$["DFS: at each node compute gain going left and right","Max gain through node = max(left,0) + max(right,0) + node.val","Update global max, but return only one direction to parent"]$json$::jsonb,
    $json${"execution":{"kind":"tree-call","method":"maxPathSum","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[-10,9,20,null,null,15,7]],"expected":42}]}$json$::jsonb,
    $json${"python":"def maxPathSum(root):\n    res = [root.val]\n    def dfs(node):\n        if not node: return 0\n        l = max(dfs(node.left), 0)\n        r = max(dfs(node.right), 0)\n        res[0] = max(res[0], node.val + l + r)\n        return node.val + max(l, r)\n    dfs(root)\n    return res[0]","javascript":"function maxPathSum(root){\n    let res=root.val;\n    function dfs(n){\n        if(!n)return 0;\n        const l=Math.max(dfs(n.left),0),r=Math.max(dfs(n.right),0);\n        res=Math.max(res,n.val+l+r);\n        return n.val+Math.max(l,r);\n    }\n    dfs(root);return res;\n}","java":"class Solution{int res;public int maxPathSum(TreeNode root){res=root.val;dfs(root);return res;}int dfs(TreeNode n){if(n==null)return 0;int l=Math.max(dfs(n.left),0),r=Math.max(dfs(n.right),0);res=Math.max(res,n.val+l+r);return n.val+Math.max(l,r);}}","cpp":"int res;int dfs(TreeNode*n){if(!n)return 0;int l=max(dfs(n->left),0),r=max(dfs(n->right),0);res=max(res,n->val+l+r);return n->val+max(l,r);}int maxPathSum(TreeNode*root){res=root->val;dfs(root);return res;}","c":"/* Implement with global max variable and recursive DFS */"}$json$::jsonb
  ),
  (
    $seed$Number of Islands$seed$,
    $seed$Given an m×n 2D binary grid of '1's (land) and '0's (water), return the number of islands.$seed$,
    $seed$Medium$seed$,
    $json$["Graph","DFS","BFS","Matrix"]$json$::jsonb,
    $json$[{"input":"grid=[[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]","output":"2"}]$json$::jsonb,
    $json$["1 ≤ m,n ≤ 300"]$json$::jsonb,
    $json$["DFS/BFS from every unvisited 1","Mark visited cells to avoid re-processing"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"numIslands","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[["1","1","0"],["0","1","0"],["0","0","1"]]],"expected":2}]}$json$::jsonb,
    $json${"python":"def numIslands(grid):\n    count = 0\n    def dfs(i, j):\n        if i<0 or i>=len(grid) or j<0 or j>=len(grid[0]) or grid[i][j]!=\"1\": return\n        grid[i][j]=\"0\"\n        for di,dj in [(0,1),(1,0),(0,-1),(-1,0)]: dfs(i+di,j+dj)\n    for i in range(len(grid)):\n        for j in range(len(grid[0])):\n            if grid[i][j]==\"1\": count+=1; dfs(i,j)\n    return count","javascript":"function numIslands(grid){\n    let count=0;\n    function dfs(i,j){\n        if(i<0||i>=grid.length||j<0||j>=grid[0].length||grid[i][j]!==\"1\")return;\n        grid[i][j]=\"0\";\n        [[0,1],[1,0],[0,-1],[-1,0]].forEach(([di,dj])=>dfs(i+di,j+dj));\n    }\n    for(let i=0;i<grid.length;i++)\n        for(let j=0;j<grid[0].length;j++)\n            if(grid[i][j]===\"1\"){count++;dfs(i,j);}\n    return count;\n}","java":"class Solution{public int numIslands(char[][] g){int c=0;for(int i=0;i<g.length;i++)for(int j=0;j<g[0].length;j++)if(g[i][j]=='1'){c++;dfs(g,i,j);}return c;}void dfs(char[][]g,int i,int j){if(i<0||i>=g.length||j<0||j>=g[0].length||g[i][j]!='1')return;g[i][j]='0';dfs(g,i+1,j);dfs(g,i-1,j);dfs(g,i,j+1);dfs(g,i,j-1);}}","cpp":"void dfs(vector<vector<char>>&g,int i,int j){if(i<0||i>=g.size()||j<0||j>=g[0].size()||g[i][j]!='1')return;g[i][j]='0';dfs(g,i+1,j);dfs(g,i-1,j);dfs(g,i,j+1);dfs(g,i,j-1);}int numIslands(vector<vector<char>>&g){int c=0;for(int i=0;i<g.size();i++)for(int j=0;j<g[0].size();j++)if(g[i][j]=='1'){c++;dfs(g,i,j);}return c;}","c":"/* BFS/DFS on 2D grid - use stack/queue for traversal */"}$json$::jsonb
  ),
  (
    $seed$Clone Graph$seed$,
    $seed$Given a reference of a node in a connected undirected graph, return a deep copy of the graph.$seed$,
    $seed$Medium$seed$,
    $json$["Graph","DFS","BFS","Hash Map"]$json$::jsonb,
    $json$[{"input":"adjList = [[2,4],[1,3],[2,4],[1,3]]","output":"[[2,4],[1,3],[2,4],[1,3]]"}]$json$::jsonb,
    $json$["1 ≤ nodes ≤ 100","1 ≤ val ≤ 100"]$json$::jsonb,
    $json$["Use hash map: original → clone","DFS/BFS: when visiting a node, clone it and recursively clone neighbors"]$json$::jsonb,
    $json${"execution":{"kind":"clone-graph","method":"cloneGraph","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[[2,4],[1,3],[2,4],[1,3]]],"expected":[[2,4],[1,3],[2,4],[1,3]]}]}$json$::jsonb,
    $json${"python":"def cloneGraph(node):\n    if not node: return None\n    seen = {}\n    def dfs(n):\n        if n in seen: return seen[n]\n        clone = Node(n.val)\n        seen[n] = clone\n        for nb in n.neighbors: clone.neighbors.append(dfs(nb))\n        return clone\n    return dfs(node)","javascript":"function cloneGraph(node){\n    if(!node)return null;\n    const map=new Map();\n    function dfs(n){\n        if(map.has(n))return map.get(n);\n        const clone={val:n.val,neighbors:[]};\n        map.set(n,clone);\n        for(const nb of n.neighbors)clone.neighbors.push(dfs(nb));\n        return clone;\n    }\n    return dfs(node);\n}","java":"class Solution{Map<Node,Node> m=new HashMap<>();public Node cloneGraph(Node n){if(n==null)return null;if(m.containsKey(n))return m.get(n);Node c=new Node(n.val);m.put(n,c);for(Node nb:n.neighbors)c.neighbors.add(cloneGraph(nb));return c;}}","cpp":"unordered_map<Node*,Node*> m;Node* cloneGraph(Node*n){if(!n)return nullptr;if(m.count(n))return m[n];Node*c=new Node(n->val);m[n]=c;for(auto nb:n->neighbors)c->neighbors.push_back(cloneGraph(nb));return c;}","c":"/* Clone graph using hash map and DFS */"}$json$::jsonb
  ),
  (
    $seed$Course Schedule (Detect Cycle in DAG)$seed$,
    $seed$There are numCourses labeled 0 to n-1. Given prerequisites[i]=[a,b] meaning must take b before a. Return true if possible to finish all courses.$seed$,
    $seed$Medium$seed$,
    $json$["Graph","Topological Sort","DFS"]$json$::jsonb,
    $json$[{"input":"numCourses=2, prerequisites=[[1,0]]","output":"true"},{"input":"numCourses=2, prerequisites=[[1,0],[0,1]]","output":"false"}]$json$::jsonb,
    $json$["1 ≤ numCourses ≤ 2000"]$json$::jsonb,
    $json$["Build adjacency list","DFS with 3 states: 0=unvisited, 1=visiting, 2=visited","If visiting node again → cycle → false"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"canFinish","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[2,[[1,0]]],"expected":true},{"args":[2,[[1,0],[0,1]]],"expected":false}]}$json$::jsonb,
    $json${"python":"def canFinish(numCourses, prerequisites):\n    graph = [[] for _ in range(numCourses)]\n    for a,b in prerequisites: graph[a].append(b)\n    state = [0]*numCourses  # 0=unvisited 1=visiting 2=done\n    def dfs(u):\n        if state[u]==1: return False\n        if state[u]==2: return True\n        state[u]=1\n        for v in graph[u]:\n            if not dfs(v): return False\n        state[u]=2\n        return True\n    return all(dfs(i) for i in range(numCourses))","javascript":"function canFinish(n,pre){\n    const g=Array.from({length:n},()=>[]);\n    for(const[a,b]of pre)g[a].push(b);\n    const state=new Array(n).fill(0);\n    function dfs(u){\n        if(state[u]===1)return false;\n        if(state[u]===2)return true;\n        state[u]=1;\n        for(const v of g[u])if(!dfs(v))return false;\n        state[u]=2;return true;\n    }\n    for(let i=0;i<n;i++)if(!dfs(i))return false;\n    return true;\n}","java":"class Solution{public boolean canFinish(int n,int[][]pre){List<List<Integer>> g=new ArrayList<>();for(int i=0;i<n;i++)g.add(new ArrayList<>());for(int[]p:pre)g.get(p[0]).add(p[1]);int[]st=new int[n];for(int i=0;i<n;i++)if(!dfs(g,st,i))return false;return true;}boolean dfs(List<List<Integer>>g,int[]st,int u){if(st[u]==1)return false;if(st[u]==2)return true;st[u]=1;for(int v:g.get(u))if(!dfs(g,st,v))return false;st[u]=2;return true;}}","cpp":"bool dfs(vector<vector<int>>&g,vector<int>&st,int u){if(st[u]==1)return false;if(st[u]==2)return true;st[u]=1;for(int v:g[u])if(!dfs(g,st,v))return false;st[u]=2;return true;}bool canFinish(int n,vector<vector<int>>&pre){vector<vector<int>> g(n);for(auto&p:pre)g[p[0]].push_back(p[1]);vector<int> st(n,0);for(int i=0;i<n;i++)if(!dfs(g,st,i))return false;return true;}","c":"/* Cycle detection in directed graph using DFS with coloring */"}$json$::jsonb
  ),
  (
    $seed$Climbing Stairs$seed$,
    $seed$You can climb 1 or 2 steps at a time. How many distinct ways to reach the top of n stairs?$seed$,
    $seed$Easy$seed$,
    $json$["DP","Math","Fibonacci"]$json$::jsonb,
    $json$[{"input":"n=2","output":"2"},{"input":"n=3","output":"3"}]$json$::jsonb,
    $json$["1 ≤ n ≤ 45"]$json$::jsonb,
    $json$["f(n) = f(n-1) + f(n-2) — Fibonacci!","Base cases: f(1)=1, f(2)=2"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"climbStairs","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[2],"expected":2},{"args":[3],"expected":3},{"args":[5],"expected":8}]}$json$::jsonb,
    $json${"python":"def climbStairs(n):\n    if n <= 2: return n\n    a, b = 1, 2\n    for _ in range(3, n+1): a, b = b, a+b\n    return b","javascript":"function climbStairs(n){\n    if(n<=2)return n;\n    let a=1,b=2;\n    for(let i=3;i<=n;i++){[a,b]=[b,a+b];}\n    return b;\n}","java":"class Solution{public int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}}","cpp":"int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}","c":"int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}"}$json$::jsonb
  ),
  (
    $seed$Coin Change$seed$,
    $seed$Given coins of different denominations and amount, return fewest coins needed to make up that amount. Return -1 if impossible.$seed$,
    $seed$Medium$seed$,
    $json$["DP","BFS"]$json$::jsonb,
    $json$[{"input":"coins=[1,5,11], amount=11","output":"2","explanation":"5+5+1? No, 11 directly = 1 coin? Wait: coin 11 exists, return 1"},{"input":"coins=[2], amount=3","output":"-1"}]$json$::jsonb,
    $json$["1 ≤ coins.length ≤ 12","0 ≤ amount ≤ 10⁴"]$json$::jsonb,
    $json$["DP bottom-up: dp[i] = min coins to make i","dp[0]=0, dp[i]=min(dp[i-c]+1) for each coin c"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"coinChange","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,5,11],11],"expected":1},{"args":[[2],3],"expected":-1},{"args":[[1,2,5],11],"expected":3}]}$json$::jsonb,
    $json${"python":"def coinChange(coins, amount):\n    dp = [float(\"inf\")] * (amount+1)\n    dp[0] = 0\n    for i in range(1, amount+1):\n        for c in coins:\n            if c <= i:\n                dp[i] = min(dp[i], dp[i-c]+1)\n    return dp[amount] if dp[amount] != float(\"inf\") else -1","javascript":"function coinChange(coins,amount){\n    const dp=new Array(amount+1).fill(Infinity);\n    dp[0]=0;\n    for(let i=1;i<=amount;i++)\n        for(const c of coins)\n            if(c<=i)dp[i]=Math.min(dp[i],dp[i-c]+1);\n    return dp[amount]===Infinity?-1:dp[amount];\n}","java":"class Solution{public int coinChange(int[]coins,int amount){int[]dp=new int[amount+1];Arrays.fill(dp,amount+1);dp[0]=0;for(int i=1;i<=amount;i++)for(int c:coins)if(c<=i)dp[i]=Math.min(dp[i],dp[i-c]+1);return dp[amount]>amount?-1:dp[amount];}}","cpp":"int coinChange(vector<int>&coins,int amount){vector<int> dp(amount+1,amount+1);dp[0]=0;for(int i=1;i<=amount;i++)for(int c:coins)if(c<=i)dp[i]=min(dp[i],dp[i-c]+1);return dp[amount]>amount?-1:dp[amount];}","c":"int coinChange(int*coins,int n,int amount){int dp[amount+1];for(int i=0;i<=amount;i++)dp[i]=amount+1;dp[0]=0;for(int i=1;i<=amount;i++)for(int j=0;j<n;j++)if(coins[j]<=i&&dp[i-coins[j]]+1<dp[i])dp[i]=dp[i-coins[j]]+1;return dp[amount]>amount?-1:dp[amount];}"}$json$::jsonb
  ),
  (
    $seed$Longest Common Subsequence$seed$,
    $seed$Given strings text1 and text2, return the length of their longest common subsequence. Return 0 if none.$seed$,
    $seed$Medium$seed$,
    $json$["DP","String"]$json$::jsonb,
    $json$[{"input":"text1=\"abcde\", text2=\"ace\"","output":"3","explanation":"\"ace\" is LCS"}]$json$::jsonb,
    $json$["1 ≤ text1.length, text2.length ≤ 1000"]$json$::jsonb,
    $json$["2D DP table","if text1[i-1]==text2[j-1]: dp[i][j] = dp[i-1][j-1]+1","else: max(dp[i-1][j], dp[i][j-1])"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"longestCommonSubsequence","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["abcde","ace"],"expected":3},{"args":["abc","abc"],"expected":3},{"args":["abc","def"],"expected":0}]}$json$::jsonb,
    $json${"python":"def longestCommonSubsequence(text1, text2):\n    m, n = len(text1), len(text2)\n    dp = [[0]*(n+1) for _ in range(m+1)]\n    for i in range(1,m+1):\n        for j in range(1,n+1):\n            if text1[i-1]==text2[j-1]: dp[i][j]=dp[i-1][j-1]+1\n            else: dp[i][j]=max(dp[i-1][j],dp[i][j-1])\n    return dp[m][n]","javascript":"function longestCommonSubsequence(t1,t2){\n    const m=t1.length,n=t2.length;\n    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));\n    for(let i=1;i<=m;i++)\n        for(let j=1;j<=n;j++)\n            dp[i][j]=t1[i-1]===t2[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);\n    return dp[m][n];\n}","java":"class Solution{public int longestCommonSubsequence(String t1,String t2){int m=t1.length(),n=t2.length();int[][]dp=new int[m+1][n+1];for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=t1.charAt(i-1)==t2.charAt(j-1)?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);return dp[m][n];}}","cpp":"int longestCommonSubsequence(string t1,string t2){int m=t1.size(),n=t2.size();vector<vector<int>> dp(m+1,vector<int>(n+1,0));for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=t1[i-1]==t2[j-1]?dp[i-1][j-1]+1:max(dp[i-1][j],dp[i][j-1]);return dp[m][n];}","c":"int longestCommonSubsequence(char*t1,char*t2){int m=strlen(t1),n=strlen(t2);int dp[m+1][n+1];memset(dp,0,sizeof(dp));for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=t1[i-1]==t2[j-1]?dp[i-1][j-1]+1:(dp[i-1][j]>dp[i][j-1]?dp[i-1][j]:dp[i][j-1]);return dp[m][n];}"}$json$::jsonb
  ),
  (
    $seed$0/1 Knapsack$seed$,
    $seed$Given n items each with weight[i] and value[i], and a knapsack of capacity W. Maximize total value without exceeding capacity. Each item can only be used once.$seed$,
    $seed$Medium$seed$,
    $json$["DP"]$json$::jsonb,
    $json$[{"input":"n=3, weights=[2,3,4], values=[3,4,5], W=5","output":"7","explanation":"Items 0+1: weight=5, value=7"}]$json$::jsonb,
    $json$["1 ≤ n ≤ 100","1 ≤ W ≤ 1000"]$json$::jsonb,
    $json$["dp[i][w] = max value using first i items with capacity w","Either skip item i or include it"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"knapsack","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[3,5,[2,3,4],[3,4,5]],"expected":7},{"args":[4,8,[1,3,4,5],[1,4,5,7]],"expected":11}]}$json$::jsonb,
    $json${"python":"def knapsack(n, W, weights, values):\n    dp = [[0]*(W+1) for _ in range(n+1)]\n    for i in range(1,n+1):\n        for w in range(W+1):\n            dp[i][w] = dp[i-1][w]\n            if weights[i-1] <= w:\n                dp[i][w] = max(dp[i][w], dp[i-1][w-weights[i-1]]+values[i-1])\n    return dp[n][W]","javascript":"function knapsack(n,W,weights,values){\n    const dp=Array.from({length:n+1},()=>new Array(W+1).fill(0));\n    for(let i=1;i<=n;i++)\n        for(let w=0;w<=W;w++){\n            dp[i][w]=dp[i-1][w];\n            if(weights[i-1]<=w)dp[i][w]=Math.max(dp[i][w],dp[i-1][w-weights[i-1]]+values[i-1]);\n        }\n    return dp[n][W];\n}","java":"class Solution{public int knapsack(int n,int W,int[]w,int[]v){int[][]dp=new int[n+1][W+1];for(int i=1;i<=n;i++)for(int c=0;c<=W;c++){dp[i][c]=dp[i-1][c];if(w[i-1]<=c)dp[i][c]=Math.max(dp[i][c],dp[i-1][c-w[i-1]]+v[i-1]);}return dp[n][W];}}","cpp":"int knapsack(int n,int W,vector<int>&w,vector<int>&v){vector<vector<int>> dp(n+1,vector<int>(W+1,0));for(int i=1;i<=n;i++)for(int c=0;c<=W;c++){dp[i][c]=dp[i-1][c];if(w[i-1]<=c)dp[i][c]=max(dp[i][c],dp[i-1][c-w[i-1]]+v[i-1]);}return dp[n][W];}","c":"int knapsack(int n,int W,int*w,int*v){int dp[n+1][W+1];memset(dp,0,sizeof(dp));for(int i=1;i<=n;i++)for(int c=0;c<=W;c++){dp[i][c]=dp[i-1][c];if(w[i-1]<=c&&dp[i-1][c-w[i-1]]+v[i-1]>dp[i][c])dp[i][c]=dp[i-1][c-w[i-1]]+v[i-1];}return dp[n][W];}"}$json$::jsonb
  ),
  (
    $seed$Word Break$seed$,
    $seed$Given string s and dictionary wordDict, return true if s can be segmented into space-separated dictionary words.$seed$,
    $seed$Medium$seed$,
    $json$["DP","Hash Set","String"]$json$::jsonb,
    $json$[{"input":"s=\"leetcode\", wordDict=[\"leet\",\"code\"]","output":"true"}]$json$::jsonb,
    $json$["1 ≤ s.length ≤ 300"]$json$::jsonb,
    $json$["dp[i] = can s[0..i] be segmented","dp[i] = true if dp[j] and s[j..i] in dict for some j"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"wordBreak","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["leetcode",["leet","code"]],"expected":true},{"args":["applepenapple",["apple","pen"]],"expected":true},{"args":["catsandog",["cats","dog","sand","and","cat"]],"expected":false}]}$json$::jsonb,
    $json${"python":"def wordBreak(s, wordDict):\n    words = set(wordDict)\n    dp = [False]*(len(s)+1)\n    dp[0] = True\n    for i in range(1,len(s)+1):\n        for j in range(i):\n            if dp[j] and s[j:i] in words:\n                dp[i] = True\n                break\n    return dp[len(s)]","javascript":"function wordBreak(s,wordDict){\n    const words=new Set(wordDict);\n    const dp=new Array(s.length+1).fill(false);\n    dp[0]=true;\n    for(let i=1;i<=s.length;i++)\n        for(let j=0;j<i;j++)\n            if(dp[j]&&words.has(s.slice(j,i))){dp[i]=true;break;}\n    return dp[s.length];\n}","java":"class Solution{public boolean wordBreak(String s,List<String> dict){Set<String> set=new HashSet<>(dict);boolean[]dp=new boolean[s.length()+1];dp[0]=true;for(int i=1;i<=s.length();i++)for(int j=0;j<i;j++)if(dp[j]&&set.contains(s.substring(j,i))){dp[i]=true;break;}return dp[s.length()];}}","cpp":"bool wordBreak(string s,vector<string>&dict){unordered_set<string> words(dict.begin(),dict.end());int n=s.size();vector<bool> dp(n+1,false);dp[0]=true;for(int i=1;i<=n;i++)for(int j=0;j<i;j++)if(dp[j]&&words.count(s.substr(j,i-j))){dp[i]=true;break;}return dp[n];}","c":"/* Word break with DP - implement with character array checks */"}$json$::jsonb
  ),
  (
    $seed$Valid Parentheses$seed$,
    $seed$Given string s with only '(',')','{','}','[',']', determine if it is valid. Must be closed in correct order.$seed$,
    $seed$Easy$seed$,
    $json$["Stack","String"]$json$::jsonb,
    $json$[{"input":"s = \"()[]{}\"","output":"true"},{"input":"s = \"(]\"","output":"false"}]$json$::jsonb,
    $json$["1 ≤ s.length ≤ 10⁴"]$json$::jsonb,
    $json$["Use a stack","Push opening brackets, pop and match on closing"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"isValid","compare":"strict","languages":["python","javascript"]},"cases":[{"args":["()[]{}"],"expected":true},{"args":["(]"],"expected":false},{"args":["{[]}"],"expected":true}]}$json$::jsonb,
    $json${"python":"def isValid(s):\n    stack = []\n    pairs = {\")\":\"(\",\"]\":\"[\",\"}\":\"{\"}\n    for c in s:\n        if c in \"([{\": stack.append(c)\n        elif not stack or stack[-1] != pairs[c]: return False\n        else: stack.pop()\n    return len(stack) == 0","javascript":"function isValid(s){\n    const stack=[],pairs={\")\":\"(\",\"]\":\"[\",\"}\":\"{\"};\n    for(const c of s){\n        if(\"([{\".includes(c))stack.push(c);\n        else if(!stack.length||stack[stack.length-1]!==pairs[c])return false;\n        else stack.pop();\n    }\n    return stack.length===0;\n}","java":"class Solution{public boolean isValid(String s){Deque<Character> st=new ArrayDeque<>();for(char c:s.toCharArray()){if(c=='('||c=='['||c=='{')st.push(c);else{if(st.isEmpty())return false;char t=st.pop();if(c==')' &&t!='('||c==']' &&t!='['||c=='}' &&t!='{')return false;}}return st.isEmpty();}}","cpp":"bool isValid(string s){stack<char> st;for(char c:s){if(c=='('||c=='['||c=='{')st.push(c);else{if(st.empty())return false;char t=st.top();st.pop();if(c==')' &&t!='('||c==']' &&t!='['||c=='}' &&t!='{')return false;}}return st.empty();}","c":"int isValid(char*s){char st[10001];int top=-1;while(*s){if(*s=='('||*s=='['||*s=='{')st[++top]=*s;else{if(top<0)return 0;char t=st[top--];if(*s==')' &&t!='('||*s==']' &&t!='['||*s=='}' &&t!='{')return 0;}s++;}return top==-1;}"}$json$::jsonb
  ),
  (
    $seed$Min Stack$seed$,
    $seed$Design a stack that supports push, pop, top, and getMin() all in O(1) time.$seed$,
    $seed$Medium$seed$,
    $json$["Stack","Design"]$json$::jsonb,
    $json$[{"input":"MinStack(); push(-2); push(0); push(-3); getMin()→-3; pop(); top()→0; getMin()→-2","output":"-3, 0, -2"}]$json$::jsonb,
    $json$["At most 3×10⁴ operations"]$json$::jsonb,
    $json$["Use an auxiliary stack to track minimums","Push min to aux stack only when needed"]$json$::jsonb,
    $json${"execution":{"kind":"min-stack","className":"MinStack","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[["push",-2],["push",0],["push",-3],["getMin"],["pop"],["getMin"]]],"expected":[-3,-2]}]}$json$::jsonb,
    $json${"python":"class MinStack:\n    def __init__(self):\n        self.stack = []\n        self.min_stack = []\n    def push(self, val):\n        self.stack.append(val)\n        self.min_stack.append(min(val, self.min_stack[-1] if self.min_stack else val))\n    def pop(self):\n        self.stack.pop()\n        self.min_stack.pop()\n    def top(self): return self.stack[-1]\n    def getMin(self): return self.min_stack[-1]","javascript":"class MinStack{\n    constructor(){this.s=[];this.m=[];}\n    push(v){this.s.push(v);this.m.push(Math.min(v,this.m.length?this.m[this.m.length-1]:v));}\n    pop(){this.s.pop();this.m.pop();}\n    top(){return this.s[this.s.length-1];}\n    getMin(){return this.m[this.m.length-1];}\n}","java":"class MinStack{Deque<Integer> s=new ArrayDeque<>(),m=new ArrayDeque<>();public void push(int v){s.push(v);m.push(m.isEmpty()?v:Math.min(v,m.peek()));}public void pop(){s.pop();m.pop();}public int top(){return s.peek();}public int getMin(){return m.peek();}}","cpp":"class MinStack{stack<int> s,m;public:void push(int v){s.push(v);m.push(m.empty()?v:min(v,m.top()));}void pop(){s.pop();m.pop();}int top(){return s.top();}int getMin(){return m.top();}};","c":"/* Min stack using two arrays */"}$json$::jsonb
  ),
  (
    $seed$Binary Search$seed$,
    $seed$Given a sorted array of distinct integers and a target, return the index if found, otherwise -1.$seed$,
    $seed$Easy$seed$,
    $json$["Binary Search","Array"]$json$::jsonb,
    $json$[{"input":"nums=[-1,0,3,5,9,12], target=9","output":"4"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 10⁴","All values distinct, sorted ascending"]$json$::jsonb,
    $json$["mid = (l+r)//2","If target == nums[mid], return mid","If target < nums[mid], search left; else search right"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"search","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[-1,0,3,5,9,12],9],"expected":4},{"args":[[-1,0,3,5,9,12],2],"expected":-1}]}$json$::jsonb,
    $json${"python":"def search(nums, target):\n    l, r = 0, len(nums)-1\n    while l <= r:\n        mid = (l+r)//2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: l = mid+1\n        else: r = mid-1\n    return -1","javascript":"function search(nums,target){\n    let l=0,r=nums.length-1;\n    while(l<=r){\n        const mid=l+r>>1;\n        if(nums[mid]===target)return mid;\n        else if(nums[mid]<target)l=mid+1;\n        else r=mid-1;\n    }\n    return -1;\n}","java":"class Solution{public int search(int[]a,int t){int l=0,r=a.length-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;else if(a[m]<t)l=m+1;else r=m-1;}return -1;}}","cpp":"int search(vector<int>&a,int t){int l=0,r=a.size()-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;else if(a[m]<t)l=m+1;else r=m-1;}return -1;}","c":"int search(int*a,int n,int t){int l=0,r=n-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;else if(a[m]<t)l=m+1;else r=m-1;}return -1;}"}$json$::jsonb
  ),
  (
    $seed$Find Minimum in Rotated Sorted Array$seed$,
    $seed$Given sorted array rotated between 1 and n times, find the minimum element.$seed$,
    $seed$Medium$seed$,
    $json$["Binary Search","Array"]$json$::jsonb,
    $json$[{"input":"nums = [3,4,5,1,2]","output":"1"},{"input":"nums = [4,5,6,7,0,1,2]","output":"0"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 5000","All values unique"]$json$::jsonb,
    $json$["Binary search on the pivot","If nums[mid] > nums[r], min is in right half","Else min is in left half including mid"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"findMin","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[3,4,5,1,2]],"expected":1},{"args":[[4,5,6,7,0,1,2]],"expected":0}]}$json$::jsonb,
    $json${"python":"def findMin(nums):\n    l, r = 0, len(nums)-1\n    while l < r:\n        mid = (l+r)//2\n        if nums[mid] > nums[r]: l = mid+1\n        else: r = mid\n    return nums[l]","javascript":"function findMin(nums){\n    let l=0,r=nums.length-1;\n    while(l<r){\n        const m=l+r>>1;\n        if(nums[m]>nums[r])l=m+1;\n        else r=m;\n    }\n    return nums[l];\n}","java":"class Solution{public int findMin(int[]a){int l=0,r=a.length-1;while(l<r){int m=(l+r)/2;if(a[m]>a[r])l=m+1;else r=m;}return a[l];}}","cpp":"int findMin(vector<int>&a){int l=0,r=a.size()-1;while(l<r){int m=(l+r)/2;if(a[m]>a[r])l=m+1;else r=m;}return a[l];}","c":"int findMin(int*a,int n){int l=0,r=n-1;while(l<r){int m=(l+r)/2;if(a[m]>a[r])l=m+1;else r=m;}return a[l];}"}$json$::jsonb
  ),
  (
    $seed$Kth Largest Element in Array$seed$,
    $seed$Given an integer array nums and integer k, return the kth largest element.$seed$,
    $seed$Medium$seed$,
    $json$["Heap","Sorting","Quick Select"]$json$::jsonb,
    $json$[{"input":"nums=[3,2,1,5,6,4], k=2","output":"5"},{"input":"nums=[3,2,3,1,2,4,5,5,6], k=4","output":"4"}]$json$::jsonb,
    $json$["1 ≤ k ≤ nums.length ≤ 10⁵"]$json$::jsonb,
    $json$["Min-heap of size k: maintain k largest","heap.top() is kth largest","Or use QuickSelect for O(n) average"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"findKthLargest","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[3,2,1,5,6,4],2],"expected":5},{"args":[[3,2,3,1,2,4,5,5,6],4],"expected":4}]}$json$::jsonb,
    $json${"python":"import heapq\ndef findKthLargest(nums, k):\n    heap = nums[:k]\n    heapq.heapify(heap)\n    for n in nums[k:]:\n        if n > heap[0]:\n            heapq.heapreplace(heap, n)\n    return heap[0]","javascript":"function findKthLargest(nums,k){\n    nums.sort((a,b)=>b-a);\n    return nums[k-1];\n}","java":"class Solution{public int findKthLargest(int[]a,int k){PriorityQueue<Integer> q=new PriorityQueue<>();for(int x:a){q.add(x);if(q.size()>k)q.poll();}return q.peek();}}","cpp":"int findKthLargest(vector<int>&a,int k){priority_queue<int,vector<int>,greater<int>> pq;for(int x:a){pq.push(x);if(pq.size()>k)pq.pop();}return pq.top();}","c":"int cmp(const void*a,const void*b){return *(int*)b-*(int*)a;}int findKthLargest(int*a,int n,int k){qsort(a,n,sizeof(int),cmp);return a[k-1];}"}$json$::jsonb
  ),
  (
    $seed$Top K Frequent Elements$seed$,
    $seed$Given integer array nums and integer k, return the k most frequent elements in any order.$seed$,
    $seed$Medium$seed$,
    $json$["Heap","Hash Map","Bucket Sort"]$json$::jsonb,
    $json$[{"input":"nums=[1,1,1,2,2,3], k=2","output":"[1,2]"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 10⁵"]$json$::jsonb,
    $json$["Count frequencies with hash map","Use min-heap of size k on (freq, num)","Or use bucket sort: bucket[freq] = nums"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"topKFrequent","compare":"unordered-outer","languages":["python","javascript"]},"cases":[{"args":[[1,1,1,2,2,3],2],"expected":[1,2]},{"args":[[1],1],"expected":[1]}]}$json$::jsonb,
    $json${"python":"def topKFrequent(nums, k):\n    from collections import Counter\n    import heapq\n    count = Counter(nums)\n    return heapq.nlargest(k, count.keys(), key=count.get)","javascript":"function topKFrequent(nums,k){\n    const c={};\n    for(const x of nums)c[x]=(c[x]||0)+1;\n    return Object.keys(c).sort((a,b)=>c[b]-c[a]).slice(0,k).map(Number);\n}","java":"class Solution{public int[] topKFrequent(int[]a,int k){Map<Integer,Integer> c=new HashMap<>();for(int x:a)c.merge(x,1,Integer::sum);PriorityQueue<Integer> pq=new PriorityQueue<>((x,y)->c.get(x)-c.get(y));for(int x:c.keySet()){pq.add(x);if(pq.size()>k)pq.poll();}int[]r=new int[k];for(int i=k-1;i>=0;i--)r[i]=pq.poll();return r;}}","cpp":"vector<int> topKFrequent(vector<int>&a,int k){unordered_map<int,int> c;for(int x:a)c[x]++;priority_queue<pair<int,int>,vector<pair<int,int>>,greater<>> pq;for(auto&p:c){pq.push({p.second,p.first});if(pq.size()>k)pq.pop();}vector<int> r;while(!pq.empty()){r.push_back(pq.top().second);pq.pop();}return r;}","c":"/* Top K using counting sort / frequency map */"}$json$::jsonb
  ),
  (
    $seed$Merge Intervals$seed$,
    $seed$Given array of intervals, merge all overlapping intervals and return an array of non-overlapping intervals.$seed$,
    $seed$Medium$seed$,
    $json$["Array","Sorting"]$json$::jsonb,
    $json$[{"input":"intervals=[[1,3],[2,6],[8,10],[15,18]]","output":"[[1,6],[8,10],[15,18]]"}]$json$::jsonb,
    $json$["1 ≤ intervals.length ≤ 10⁴"]$json$::jsonb,
    $json$["Sort by start time","If curr.start <= prev.end, merge by updating prev.end"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"merge","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[[1,3],[2,6],[8,10],[15,18]]],"expected":[[1,6],[8,10],[15,18]]},{"args":[[[1,4],[4,5]]],"expected":[[1,5]]}]}$json$::jsonb,
    $json${"python":"def merge(intervals):\n    intervals.sort(key=lambda x: x[0])\n    res = [intervals[0]]\n    for s, e in intervals[1:]:\n        if s <= res[-1][1]: res[-1][1] = max(res[-1][1], e)\n        else: res.append([s, e])\n    return res","javascript":"function merge(intervals){\n    intervals.sort((a,b)=>a[0]-b[0]);\n    const res=[intervals[0]];\n    for(const[s,e] of intervals.slice(1)){\n        if(s<=res[res.length-1][1])res[res.length-1][1]=Math.max(res[res.length-1][1],e);\n        else res.push([s,e]);\n    }\n    return res;\n}","java":"class Solution{public int[][] merge(int[][]a){Arrays.sort(a,(x,y)->x[0]-y[0]);List<int[]> r=new ArrayList<>();r.add(a[0]);for(int i=1;i<a.length;i++){int[]last=r.get(r.size()-1);if(a[i][0]<=last[1])last[1]=Math.max(last[1],a[i][1]);else r.add(a[i]);}return r.toArray(new int[0][]);}}","cpp":"vector<vector<int>> merge(vector<vector<int>>&a){sort(a.begin(),a.end());vector<vector<int>> r={a[0]};for(int i=1;i<a.size();i++){if(a[i][0]<=r.back()[1])r.back()[1]=max(r.back()[1],a[i][1]);else r.push_back(a[i]);}return r;}","c":"/* Sort intervals then merge overlapping ones */"}$json$::jsonb
  ),
  (
    $seed$Number of 1 Bits (Hamming Weight)$seed$,
    $seed$Write a function that takes an unsigned integer and returns the number of 1 bits it has.$seed$,
    $seed$Easy$seed$,
    $json$["Bit Manipulation","Math"]$json$::jsonb,
    $json$[{"input":"n = 00000000000000000000000000001011","output":"3"},{"input":"n = 11111111111111111111111111111101","output":"31"}]$json$::jsonb,
    $json$["1 ≤ n ≤ 2³¹-1"]$json$::jsonb,
    $json$["n & (n-1) clears the lowest set bit","Count iterations until n becomes 0"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"hammingWeight","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[11],"expected":3},{"args":[128],"expected":1}]}$json$::jsonb,
    $json${"python":"def hammingWeight(n):\n    count = 0\n    while n:\n        n &= n-1\n        count += 1\n    return count","javascript":"function hammingWeight(n){\n    let c=0;\n    while(n){n=n&(n-1);c++;}\n    return c;\n}","java":"class Solution{public int hammingWeight(int n){int c=0;while(n!=0){n&=n-1;c++;}return c;}}","cpp":"int hammingWeight(uint32_t n){int c=0;while(n){n&=n-1;c++;}return c;}","c":"int hammingWeight(uint32_t n){int c=0;while(n){n&=n-1;c++;}return c;}"}$json$::jsonb
  ),
  (
    $seed$Reverse Bits$seed$,
    $seed$Reverse bits of a given 32-bit unsigned integer.$seed$,
    $seed$Easy$seed$,
    $json$["Bit Manipulation"]$json$::jsonb,
    $json$[{"input":"n = 00000010100101000001111010011100","output":"00111001011110000010100101000000 = 964176192"}]$json$::jsonb,
    $json$["Input is 32-bit unsigned integer"]$json$::jsonb,
    $json$["Iterate 32 times","Extract LSB and shift into result from left"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"reverseBits","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[43261596],"expected":964176192},{"args":[4294967293],"expected":3221225471}]}$json$::jsonb,
    $json${"python":"def reverseBits(n):\n    res = 0\n    for _ in range(32):\n        res = (res << 1) | (n & 1)\n        n >>= 1\n    return res","javascript":"function reverseBits(n){\n    let r=0;\n    for(let i=0;i<32;i++){r=(r*2)+(n&1);n>>=1;}\n    return r>>>0;\n}","java":"class Solution{public int reverseBits(int n){int r=0;for(int i=0;i<32;i++){r=(r<<1)|(n&1);n>>>=1;}return r;}}","cpp":"uint32_t reverseBits(uint32_t n){uint32_t r=0;for(int i=0;i<32;i++){r=(r<<1)|(n&1);n>>=1;}return r;}","c":"uint32_t reverseBits(uint32_t n){uint32_t r=0;for(int i=0;i<32;i++){r=(r<<1)|(n&1);n>>=1;}return r;}"}$json$::jsonb
  ),
  (
    $seed$Subsets$seed$,
    $seed$Given an integer array nums of unique elements, return all possible subsets (the power set). Do not include duplicates.$seed$,
    $seed$Medium$seed$,
    $json$["Backtracking","Array","Bit Manipulation"]$json$::jsonb,
    $json$[{"input":"nums = [1,2,3]","output":"[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 10"]$json$::jsonb,
    $json$["Backtrack: for each element decide include or exclude","Or iterate: for each new number, add it to all existing subsets"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"subsets","compare":"deep-unordered","languages":["python","javascript"]},"cases":[{"args":[[1,2,3]],"expected":[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]}]}$json$::jsonb,
    $json${"python":"def subsets(nums):\n    res = [[]]\n    for n in nums:\n        res += [sub + [n] for sub in res]\n    return res","javascript":"function subsets(nums){\n    let res=[[]];\n    for(const n of nums)res=[...res,...res.map(s=>[...s,n])];\n    return res;\n}","java":"class Solution{public List<List<Integer>> subsets(int[]nums){List<List<Integer>> r=new ArrayList<>();r.add(new ArrayList<>());for(int n:nums){int sz=r.size();for(int i=0;i<sz;i++){List<Integer> s=new ArrayList<>(r.get(i));s.add(n);r.add(s);}}return r;}}","cpp":"vector<vector<int>> subsets(vector<int>&a){vector<vector<int>> r={{}};for(int n:a){int sz=r.size();for(int i=0;i<sz;i++){r.push_back(r[i]);r.back().push_back(n);}}return r;}","c":"/* Generate all subsets using bit manipulation on 2^n */"}$json$::jsonb
  ),
  (
    $seed$Permutations$seed$,
    $seed$Given array of distinct integers, return all possible permutations.$seed$,
    $seed$Medium$seed$,
    $json$["Backtracking","Array"]$json$::jsonb,
    $json$[{"input":"nums = [1,2,3]","output":"[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 6"]$json$::jsonb,
    $json$["Backtrack: swap element at current position with all elements at i..n","Or: for each element, insert it in all positions of sub-permutation"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"permute","compare":"unordered-outer","languages":["python","javascript"]},"cases":[{"args":[[1,2,3]],"expected":[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]}]}$json$::jsonb,
    $json${"python":"def permute(nums):\n    res = []\n    def bt(start):\n        if start == len(nums): res.append(nums[:]); return\n        for i in range(start, len(nums)):\n            nums[start], nums[i] = nums[i], nums[start]\n            bt(start+1)\n            nums[start], nums[i] = nums[i], nums[start]\n    bt(0)\n    return res","javascript":"function permute(nums){\n    const res=[];\n    function bt(start){\n        if(start===nums.length){res.push([...nums]);return;}\n        for(let i=start;i<nums.length;i++){\n            [nums[start],nums[i]]=[nums[i],nums[start]];\n            bt(start+1);\n            [nums[start],nums[i]]=[nums[i],nums[start]];\n        }\n    }\n    bt(0);return res;\n}","java":"class Solution{public List<List<Integer>> permute(int[]a){List<List<Integer>> r=new ArrayList<>();bt(a,0,r);return r;}void bt(int[]a,int s,List<List<Integer>> r){if(s==a.length){List<Integer> p=new ArrayList<>();for(int x:a)p.add(x);r.add(p);return;}for(int i=s;i<a.length;i++){int t=a[s];a[s]=a[i];a[i]=t;bt(a,s+1,r);t=a[s];a[s]=a[i];a[i]=t;}}}","cpp":"vector<vector<int>> permute(vector<int>&a){vector<vector<int>> r;function<void(int)> bt=[&](int s){if(s==a.size()){r.push_back(a);return;}for(int i=s;i<a.size();i++){swap(a[s],a[i]);bt(s+1);swap(a[s],a[i]);}};bt(0);return r;}","c":"/* Generate permutations using recursive backtracking with swaps */"}$json$::jsonb
  ),
  (
    $seed$Sliding Window Maximum$seed$,
    $seed$Given array nums and integer k, return max value in each sliding window of size k.$seed$,
    $seed$Hard$seed$,
    $json$["Sliding Window","Deque","Array"]$json$::jsonb,
    $json$[{"input":"nums=[1,3,-1,-3,5,3,6,7], k=3","output":"[3,3,5,5,6,7]"}]$json$::jsonb,
    $json$["1 ≤ nums.length ≤ 10⁵","1 ≤ k ≤ nums.length"]$json$::jsonb,
    $json$["Use monotonic deque storing indices","Deque front = max of current window","Remove indices outside window from front, smaller values from back"]$json$::jsonb,
    $json${"execution":{"kind":"call","method":"maxSlidingWindow","compare":"strict","languages":["python","javascript"]},"cases":[{"args":[[1,3,-1,-3,5,3,6,7],3],"expected":[3,3,5,5,6,7]}]}$json$::jsonb,
    $json${"python":"from collections import deque\ndef maxSlidingWindow(nums, k):\n    dq, res = deque(), []\n    for i, n in enumerate(nums):\n        while dq and dq[0] < i-k+1: dq.popleft()\n        while dq and nums[dq[-1]] < n: dq.pop()\n        dq.append(i)\n        if i >= k-1: res.append(nums[dq[0]])\n    return res","javascript":"function maxSlidingWindow(nums,k){\n    const dq=[],res=[];\n    for(let i=0;i<nums.length;i++){\n        while(dq.length&&dq[0]<i-k+1)dq.shift();\n        while(dq.length&&nums[dq[dq.length-1]]<nums[i])dq.pop();\n        dq.push(i);\n        if(i>=k-1)res.push(nums[dq[0]]);\n    }\n    return res;\n}","java":"class Solution{public int[] maxSlidingWindow(int[]a,int k){int n=a.length;int[]r=new int[n-k+1];Deque<Integer> dq=new ArrayDeque<>();for(int i=0;i<n;i++){while(!dq.isEmpty()&&dq.peek()<i-k+1)dq.poll();while(!dq.isEmpty()&&a[dq.peekLast()]<a[i])dq.pollLast();dq.add(i);if(i>=k-1)r[i-k+1]=a[dq.peek()];}return r;}}","cpp":"vector<int> maxSlidingWindow(vector<int>&a,int k){deque<int> dq;vector<int> r;for(int i=0;i<a.size();i++){while(!dq.empty()&&dq.front()<i-k+1)dq.pop_front();while(!dq.empty()&&a[dq.back()]<a[i])dq.pop_back();dq.push_back(i);if(i>=k-1)r.push_back(a[dq.front()]);}return r;}","c":"/* Sliding window max using monotonic deque with array */"}$json$::jsonb
  )
), upgraded AS (
  UPDATE public.dsa_problems AS existing
  SET
    title = seed.title,
    description = seed.description,
    difficulty = seed.difficulty,
    tags = seed.tags,
    examples = seed.examples,
    constraints = seed.constraints,
    hints = seed.hints,
    test_cases = seed.test_cases,
    starter_code = seed.starter_code
  FROM seed
  WHERE lower(trim(existing.title)) = lower(trim(seed.title))
  RETURNING existing.id
)
INSERT INTO public.dsa_problems (
  title, description, difficulty, tags, examples, constraints, hints, test_cases, starter_code
)
SELECT
  seed.title, seed.description, seed.difficulty, seed.tags, seed.examples,
  seed.constraints, seed.hints, seed.test_cases, seed.starter_code
FROM seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dsa_problems AS existing
  WHERE lower(trim(existing.title)) = lower(trim(seed.title))
);
