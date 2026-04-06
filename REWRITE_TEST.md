# Humanize 改写功能测试样本

## 测试步骤

1. 打开 https://1anthanum.github.io/humanize/
2. 粘贴测试样本 → 点 **Analyze**
3. 切到 **Style Profile** 标签
4. 在 Reference Profile 下拉框选择 **CHI**（或其他已有 preset）
5. 如果有风格偏差，下方会出现 **Settings** 面板和 **Rewrite** 按钮
6. 在 Settings 面板填入 Proxy URL：`https://humanize-proxy.xuyangchen.workers.dev`
7. API Key 留空
8. 点 **Rewrite**，观察改写结果

---

## Sample R1：AI 生成的结论段（高 AI 分，多偏差）

预期：高 filler density、高 connector frequency，应触发多条偏差

```
In conclusion, this paper presents a comprehensive framework for leveraging large language models in academic writing assistance. Our experimental results demonstrate that the proposed approach achieves state-of-the-art performance across a wide range of evaluation benchmarks. Furthermore, the system seamlessly integrates with existing scholarly workflows, providing valuable insights into the writing process. Moreover, it is important to note that our method establishes a solid foundation for future research in this rapidly evolving field. Overall, these findings suggest promising directions for developing more sophisticated AI-powered tools that empower researchers to produce higher-quality manuscripts.
```

---

## Sample R2：句子过长的 AI 摘要（高 avgSentenceLength 偏差）

预期：平均句长远高于 CHI 参考值（~14 词），应触发 sentence length 偏差

```
The increasing prevalence of artificial intelligence in academic research has led to significant concerns about the authenticity and originality of scholarly publications, particularly in computer science where large language models can generate plausible-sounding technical prose with minimal human oversight. Our proposed detection framework addresses this challenge by combining rule-based heuristic analysis of surface-level linguistic patterns with statistical comparison against venue-specific style profiles derived from curated corpora of human-written papers accepted at top-tier conferences. The evaluation demonstrates that our approach reliably distinguishes between human-authored and AI-generated sections across six different paper components, achieving a well-ordered score gradient that correlates strongly with actual AI involvement levels as confirmed through controlled experiments.
```

---

## Sample R3：被动语态过多（高 passiveVoiceRatio 偏差）

预期：被动语态比例远高于 CHI 参考值（~13%），应触发 passive voice 偏差

```
The dataset was collected from three publicly available repositories. All images were resized to 224x224 pixels and were normalized using ImageNet statistics. The model was initialized with pre-trained weights and was fine-tuned for 50 epochs. The learning rate was set to 0.001 and was reduced by a factor of 10 every 15 epochs. The training process was monitored using a validation set that was held out from the training data. All experiments were conducted on a single NVIDIA A100 GPU. The results were averaged over five independent runs and were reported with standard deviations.
```

---

## Sample R4：Hedge 词过多（高 hedgeDensity 偏差）

预期：限定词密度高，应触发 hedge density 偏差

```
The results seem to suggest that our approach may potentially outperform existing baselines in certain scenarios. It appears that the model could possibly generalize to somewhat different domains, although this might require additional fine-tuning. We believe that these preliminary findings arguably indicate a relatively promising direction, though further investigation would likely be needed to fully validate these somewhat tentative conclusions. It is perhaps worth noting that the observed improvements might not necessarily hold across all possible evaluation settings.
```

---

## Sample R5：中文测试样本（高 AI 模板密度）

预期：中文模式下触发偏差，测试中文改写 prompt

```
本文提出了一个全面的框架，旨在探讨大语言模型在学术写作辅助中的应用。值得注意的是，我们的方法在多个评估基准上取得了显著的性能提升。此外，该系统能够无缝集成到现有的学术工作流程中。与此同时，实验结果表明，所提出的方法为未来的研究奠定了坚实的基础。总的来说，这些发现为开发更加智能化的写作辅助工具指明了方向。
```

---

## 检查清单

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | Settings 面板能否正常显示 | Proxy URL 输入框 + API Key 输入框 |
| 2 | 填入 proxy URL 后 Rewrite 按钮是否可点击 | 按钮变为可点击状态 |
| 3 | R1 样本改写结果是否去除了 AI 套话 | "In conclusion"、"comprehensive"、"leveraging" 等被替换 |
| 4 | R2 样本改写结果是否缩短了句子 | 长句被拆分，平均句长下降 |
| 5 | R3 样本改写结果是否减少了被动语态 | 部分被动改为主动 |
| 6 | R4 样本改写结果是否减少了 hedge 词 | "may potentially"、"could possibly" 等被精简 |
| 7 | R5 中文样本是否正常返回中文改写 | 中文回复，且去除了"值得注意的是"等模板 |
| 8 | 改写说明（EXPLAIN）是否有意义 | 解释了具体做了哪些调整 |
| 9 | Copy 按钮能否正常复制改写结果 | 点击后剪贴板有内容 |
| 10 | 无偏差时 Rewrite 面板是否隐藏 | P2 类样本不应出现改写按钮 |
